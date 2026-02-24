<?php

header('Content-Type: application/json');

$githubToken = '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';
$user = $_GET['user'] ?? 'AaronCreor';
$user = trim($user) !== '' ? trim($user) : 'AaronCreor';

function gh_get(string $url, string $token): array
{
    $headers = [
        'User-Agent: aaroncreor-site',
        'Accept: application/vnd.github+json',
        'X-GitHub-Api-Version: 2022-11-28',
    ];

    if ($token !== '') {
        $headers[] = "Authorization: Bearer {$token}";
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'header' => implode("\r\n", $headers) . "\r\n",
            'ignore_errors' => true,
            'timeout' => 15,
        ],
    ]);

    $data = file_get_contents($url, false, $context);
    if ($data === false) {
        throw new Exception('GitHub request failed');
    }

    $decoded = json_decode($data, true);
    if (!is_array($decoded)) {
        throw new Exception('Invalid GitHub response');
    }

    return $decoded;
}

try {
    $encodedUser = rawurlencode($user);
    $repos = gh_get(
        "https://api.github.com/users/{$encodedUser}/repos?per_page=100&sort=pushed",
        $githubToken
    );

    $candidates = array_values(array_filter($repos, static function ($repo) {
        return is_array($repo) && !($repo['fork'] ?? false);
    }));

    $sample = array_slice($candidates, 0, 25);
    $totals = [];

    foreach ($sample as $repo) {
        if (!isset($repo['languages_url']) || !is_string($repo['languages_url'])) {
            continue;
        }

        $languages = gh_get($repo['languages_url'], $githubToken);
        foreach ($languages as $lang => $bytes) {
            if (!is_string($lang) || !is_numeric($bytes)) {
                continue;
            }

            $totals[$lang] = ($totals[$lang] ?? 0) + (int) $bytes;
        }
    }

    arsort($totals);
    $top = array_slice($totals, 0, 12, true);
    $sum = array_sum($top) ?: 1;

    $languageList = [];
    foreach ($top as $lang => $bytes) {
        $languageList[] = [
            'lang' => $lang,
            'pct' => (int) round(($bytes / $sum) * 100),
        ];
    }

    header('Cache-Control: public, max-age=3600');
    echo json_encode([
        'user' => $user,
        'sampled_repos' => count($sample),
        'languages' => $languageList,
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to load languages']);
}
