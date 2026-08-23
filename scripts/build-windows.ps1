$ErrorActionPreference = "Stop"

Write-Host "[FRAME] Checking Windows build prerequisites..."

foreach ($command in @("node", "npm", "cargo", "rustc", "ffmpeg", "ffprobe")) {
  if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $command"
  }
}

Write-Host "[FRAME] Installing JavaScript dependencies..."
npm install

Write-Host "[FRAME] Running tests and frontend checks..."
npm run test
npm run lint
npm run build

Write-Host "[FRAME] Building NSIS and MSI installers..."
npm run desktop:build

Write-Host "[FRAME] Finished. See src-tauri\target\release\bundle"
