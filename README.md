# AaronCreor Website

Personal portfolio website with a lightweight PHP API endpoint for GitHub language frequency stats and GitHub Actions FTP deployment.

## Purpose

- Serve a fast personal website/portfolio (`index.html`)
- Provide a mini projects index page (`mini-projects/index.html`)
- Provide a standalone IT ticket email classifier page (`mini-projects/email-classifier.html`)
- Display static portfolio content (resume, research PDF, media)
- Load GitHub language frequency data dynamically via a small PHP endpoint
- Classify pasted IT ticket email text as a request, incident, or human-review case
- Deploy automatically to shared hosting using GitHub Actions

## Stack

- `HTML5` (`index.html`)
- `CSS` (`css/index.css`)
- `JavaScript` (`js/index.js`)
- `PHP` (`api/github-langs.php`, `api/email-classifier.php`) for API requests and aggregation
- `GitHub Actions` for CI/CD
- `FTP` deployment using `SamKirkland/FTP-Deploy-Action`

## Project Structure

```text
.
├── index.html
├── css/
│   └── index.css
├── js/
│   └── index.js
├── api/
│   └── github-langs.php
├── media/
│   ├── Aaron_Resume.pdf
│   ├── SuperTuxKart.webm
│   ├── Predicting Canadian Population Growth Through Machine Learning.pdf
│   └── SDN.pdf
└── .github/
    └── workflows/
        └── deploy.yml
```

## How It Works

- `index.html` loads the page layout and references `css/index.css` + `js/index.js`
- `js/index.js` calls `api/github-langs.php?user=AaronCreor`
- `api/github-langs.php` fetches GitHub repo language data, aggregates it, and returns JSON
- `api/email-classifier.php` calls the Google Gemini API (OpenAI-compatible endpoint) server-side and returns a hard classification
- The language frequency UI is rendered client-side in JavaScript

## GitHub Token Handling (API)

`api/github-langs.php` supports two token sources (in this order):

1. `api/github-token.php` (generated at deploy time)
2. `GITHUB_TOKEN` environment variable

This keeps secrets out of tracked source files.

## Gemini API Handling (Email Classifier)

`api/email-classifier.php` supports two configuration sources:

1. `api/gemini-config.php` (generated at deploy time)
2. Environment variables

The generated config supports `GEMINI_API_KEY`, `GEMINI_MODEL`, and `GEMINI_ENDPOINT`. Only the API key is required: the model defaults to `gemini-flash-lite-latest` (free tier) and the endpoint defaults to `https://generativelanguage.googleapis.com/v1beta/openai`.

### `api/gemini-config.php` format

```php
<?php
return [
    'api_key' => 'your_gemini_api_key_here',
];
```

### `api/github-token.php` format

```php
<?php
return 'your_github_token_here';
```

## Deployment (GitHub Actions + FTP)

Deployment is configured in `.github/workflows/deploy.yml`.

### Triggers

- Push to `master`
- Manual run (`workflow_dispatch`)

### What the workflow does

1. Checks out the repo
2. Generates `api/github-token.php` and `api/gemini-config.php` from GitHub Actions secrets (`GITHUBTOKEN`, `GEMINI_API_KEY`)
3. Deploys site files to the remote server via FTP
4. Excludes `.git`, `.github`, and other local-only files from upload

## Required GitHub Actions Secrets

- `FTP_SERVER`
- `FTP_USERNAME`
- `FTP_PASSWORD`
- `FTP_PORT`
- `REMOTE_PATH`
- `GITHUBTOKEN` (used to generate `api/github-token.php` during deploy)
- `GEMINI_API_KEY` (used to generate `api/gemini-config.php` during deploy)
- Optional: `GEMINI_MODEL`, `GEMINI_ENDPOINT`
