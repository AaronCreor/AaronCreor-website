<?php

header('Content-Type: application/json');
header('Cache-Control: no-store');

const EMAIL_MAX_CHARS = 1000;
const DEFAULT_MODEL = 'gpt-4o-mini';

function respond_json(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function config_value(array $config, string $key, string $envKey, string $default = ''): string
{
    $configuredValue = $config[$key] ?? '';
    if (is_string($configuredValue) && trim($configuredValue) !== '') {
        return trim($configuredValue);
    }

    $envValue = getenv($envKey);
    if (is_string($envValue) && trim($envValue) !== '') {
        return trim($envValue);
    }

    return $default;
}

function text_length(string $text): int
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($text, 'UTF-8');
    }

    return strlen($text);
}

function normalize_classification(string $value): string
{
    $normalized = strtolower(trim($value));
    $normalized = str_replace(['-', ' '], '_', $normalized);

    if (in_array($normalized, ['request', 'incident', 'needs_human_review'], true)) {
        return $normalized;
    }

    if (strpos($normalized, 'human') !== false) {
        return 'needs_human_review';
    }

    return '';
}

function extract_classification(string $content): string
{
    $decoded = json_decode($content, true);
    if (is_array($decoded) && isset($decoded['classification']) && is_string($decoded['classification'])) {
        return normalize_classification($decoded['classification']);
    }

    return normalize_classification($content);
}

function call_classifier_model(string $endpoint, string $credential, string $credentialType, string $model, string $emailBody): array
{
    $url = rtrim($endpoint, '/') . '/chat/completions';
    $headers = [
        'Content-Type: application/json',
        'Accept: application/json',
    ];

    if ($credentialType === 'api-key') {
        $headers[] = "api-key: {$credential}";
    } else {
        $headers[] = "Authorization: Bearer {$credential}";
    }

    $payload = [
        'model' => $model,
        'temperature' => 0,
        'max_tokens' => 40,
        'response_format' => ['type' => 'json_object'],
        'messages' => [
            [
                'role' => 'system',
                'content' =>
                    "You are an IT ticket triage agent. Classify the pasted email body into exactly one label.\n" .
                    "Use request when the sender asks for a standard service, access, information, a change, equipment, or help that is not caused by broken or degraded service.\n" .
                    "Use incident when the sender reports an unplanned interruption, outage, error, degraded service, security concern, or something broken that prevents normal work.\n" .
                    "Use needs_human_review when the email is ambiguous, mixed, missing important context, non-IT, sensitive, spam-like, or cannot be confidently classified.\n" .
                    "Return only compact JSON in this shape: {\"classification\":\"request\"}. The value must be request, incident, or needs_human_review.",
            ],
            [
                'role' => 'user',
                'content' => "Email body:\n" . $emailBody,
            ],
        ],
    ];

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => implode("\r\n", $headers) . "\r\n",
            'content' => json_encode($payload),
            'ignore_errors' => true,
            'timeout' => 20,
        ],
    ]);

    $body = file_get_contents($url, false, $context);
    $status = 0;

    if (isset($http_response_header) && is_array($http_response_header)) {
        foreach ($http_response_header as $header) {
            if (preg_match('/^HTTP\/\S+\s+(\d+)/', $header, $matches)) {
                $status = (int) $matches[1];
                break;
            }
        }
    }

    if ($body === false) {
        throw new Exception('The classifier service could not be reached.');
    }

    $decoded = json_decode($body, true);
    if (!is_array($decoded)) {
        throw new Exception('The classifier service returned an unreadable response.');
    }

    if ($status < 200 || $status >= 300) {
        $message = $decoded['error']['message'] ?? $decoded['message'] ?? 'The classifier service rejected the request.';
        throw new Exception(is_string($message) ? $message : 'The classifier service rejected the request.');
    }

    return $decoded;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond_json(405, ['error' => 'Use POST to classify an email.']);
}

$config = [];
$configFile = __DIR__ . '/azure-ai-config.php';
if (is_file($configFile)) {
    $loadedConfig = require $configFile;
    if (is_array($loadedConfig)) {
        $config = $loadedConfig;
    }
}

$endpoint = config_value($config, 'endpoint', 'AZURE_AI_ENDPOINT');
$model = config_value($config, 'model', 'AZURE_AI_MODEL', DEFAULT_MODEL);
$apiKey = config_value($config, 'api_key', 'AZURE_AI_KEY');
$token = config_value($config, 'token', 'AZURE_AI_TOKEN');

if ($token === '') {
    $token = getenv('GITHUB_TOKEN') ?: getenv('GITHUBTOKEN') ?: '';
}

if ($endpoint === '') {
    respond_json(500, ['error' => 'Classifier endpoint is not configured.']);
}

if ($apiKey === '' && $token === '') {
    respond_json(500, ['error' => 'Classifier credentials are not configured.']);
}

$rawBody = file_get_contents('php://input');
if ($rawBody === false || strlen($rawBody) > 5000) {
    respond_json(400, ['error' => 'Request body is invalid.']);
}

$decodedBody = json_decode($rawBody, true);
if (!is_array($decodedBody) || !isset($decodedBody['emailBody']) || !is_string($decodedBody['emailBody'])) {
    respond_json(400, ['error' => 'Email body is required.']);
}

$emailBody = trim($decodedBody['emailBody']);
$length = text_length($emailBody);

if ($length === 0) {
    respond_json(400, ['error' => 'Email body is required.']);
}

if ($length > EMAIL_MAX_CHARS) {
    respond_json(400, ['error' => 'Email body must be 1000 characters or fewer.']);
}

try {
    $credential = $apiKey !== '' ? $apiKey : $token;
    $credentialType = $apiKey !== '' ? 'api-key' : 'bearer';
    $response = call_classifier_model($endpoint, $credential, $credentialType, $model, $emailBody);
    $content = $response['choices'][0]['message']['content'] ?? '';

    if (!is_string($content)) {
        throw new Exception('The classifier response did not include a message.');
    }

    $classification = extract_classification($content);
    if ($classification === '') {
        $classification = 'needs_human_review';
    }

    respond_json(200, ['classification' => $classification]);
} catch (Throwable $e) {
    respond_json(502, ['error' => 'Classifier unavailable. Please try again later.']);
}
