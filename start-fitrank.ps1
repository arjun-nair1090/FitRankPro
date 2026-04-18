$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

New-Item -ItemType Directory -Force -Path (Join-Path $backend "out") | Out-Null
javac -d (Join-Path $backend "out") (Join-Path $backend "src\com\fitrank\app\*.java")

Start-Process -FilePath java -ArgumentList "-cp", "out", "com.fitrank.app.FitRankServer" -WorkingDirectory $backend
Start-Process -FilePath python -ArgumentList "-m", "http.server", "5173" -WorkingDirectory $frontend

Write-Host "FitRank API: http://localhost:8080/api"
Write-Host "FitRank PWA: http://localhost:5173"
Write-Host "For iPhone on the same Wi-Fi, open http://YOUR_COMPUTER_IP:5173"
