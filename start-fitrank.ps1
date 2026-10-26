# Builds and starts FitRank (API + web app on one port), then opens it in the browser.
# Uses PostgreSQL when reachable (see README for FITRANK_DB_* variables), otherwise in-memory storage.
$ErrorActionPreference = "Stop"
$backend = Join-Path $PSScriptRoot "backend"
$jar = Join-Path $backend "lib\postgresql.jar"
$port = if ($env:PORT) { $env:PORT } else { "8080" }

if (-not (Test-Path $jar)) {
  Write-Host "Downloading the PostgreSQL JDBC driver..."
  New-Item -ItemType Directory -Force -Path (Split-Path $jar) | Out-Null
  Invoke-WebRequest "https://repo1.maven.org/maven2/org/postgresql/postgresql/42.7.4/postgresql-42.7.4.jar" -OutFile $jar
}

Push-Location $backend
try {
  javac --release 8 -nowarn -d out (Get-ChildItem src\com\fitrank\app\*.java).FullName
  if ($LASTEXITCODE -ne 0) { throw "Compilation failed" }
  Start-Job -ScriptBlock { param($p) Start-Sleep 2; Start-Process "http://localhost:$p" } -ArgumentList $port | Out-Null
  java -cp "out;lib\postgresql.jar" com.fitrank.app.FitRankServer
} finally {
  Pop-Location
}
