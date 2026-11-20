$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
function Open-Recall {
    # Embedded Chromium browsers can expose SpeechRecognition without a working speech service.
    # Prefer installed Google Chrome for browser dictation, retaining the usual browser fallback.
    $chromeCandidates = @(
        (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'),
        (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'),
        (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
    )
    $chromePath = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if ($chromePath) { Start-Process -FilePath $chromePath -ArgumentList 'http://127.0.0.1:4317' -WindowStyle Hidden }
    else { Start-Process 'http://127.0.0.1:4317' }
}
try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:4317/api/health' -TimeoutSec 2
    if ($health.name -eq 'Recall') { Open-Recall; exit }
} catch { }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js 24 or later, then reopen Recall.' }
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules'))) {
    & npm.cmd install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
}
if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'dist/index.html'))) {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'The app could not build.' }
}
$nodePath = (Get-Command node).Source
Start-Process -FilePath $nodePath -ArgumentList 'server/index.mjs' -WorkingDirectory $PSScriptRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $PSScriptRoot 'recall.log') -RedirectStandardError (Join-Path $PSScriptRoot 'recall-error.log')
for ($attempt = 0; $attempt -lt 40; $attempt++) {
    try {
        $health = Invoke-RestMethod -Uri 'http://127.0.0.1:4317/api/health' -TimeoutSec 2
        if ($health.name -eq 'Recall') { Open-Recall; exit }
    } catch { }
    Start-Sleep -Milliseconds 500
}
throw 'Recall did not start. See recall-error.log in the app folder.'
