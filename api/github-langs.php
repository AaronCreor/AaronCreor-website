<?php
header('Content-Type: application/json');

// 🔒 Put your NEW token here (or better: use an environment variable if your host supports it)
$GITHUB_TOKEN = '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';

$user = $_GET['user'] ?? 'AaronCreor';

function gh_get($url, $token){
  $opts = [
    "http" => [
      "method" => "GET",
      "header" =>
        "User-Agent: aaroncreor-site\r\n" .
        "Accept: application/vnd.github+json\r\n" .
        "Authorization: Bearer $token\r\n" .
        "X-GitHub-Api-Version: 2022-11-28\r\n"
    ]
  ];
  $ctx = stream_context_create($opts);
  $data = file_get_contents($url, false, $ctx);
  if ($data === false) throw new Exception("GitHub request failed");
  return json_decode($data, true);
}

try {
  // 1) Fetch repos
  $repos = gh_get("https://api.github.com/users/$user/repos?per_page=100&sort=pushed", $GITHUB_TOKEN);

  // Filter out forks
  $candidates = array_values(array_filter($repos, fn($r) => !$r['fork']));

  // Limit to avoid hammering API
  $sample = array_slice($candidates, 0, 25);

  // 2) Aggregate language bytes
  $totals = [];
  foreach ($sample as $r){
    $langs = gh_get($r['languages_url'], $GITHUB_TOKEN);
    foreach ($langs as $lang => $bytes){
      $totals[$lang] = ($totals[$lang] ?? 0) + $bytes;
    }
  }

  arsort($totals);
  $top = array_slice($totals, 0, 12, true);
  $sum = array_sum($top) ?: 1;

  $languages = [];
  foreach ($top as $lang => $bytes){
    $languages[] = [
      "lang" => $lang,
      "pct" => (int) round(($bytes / $sum) * 100)
    ];
  }

  header("Cache-Control: public, max-age=3600");
  echo json_encode([
    "user" => $user,
    "sampled_repos" => count($sample),
    "languages" => $languages
  ]);
} catch (Exception $e){
  http_response_code(500);
  echo json_encode(["error" => "Failed to load languages"]);
}