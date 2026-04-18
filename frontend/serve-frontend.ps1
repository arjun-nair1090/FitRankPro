$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:5173/")
$listener.Start()

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Get-ContentType([string]$path) {
  switch ([System.IO.Path]::GetExtension($path).ToLowerInvariant()) {
    ".html" { return "text/html; charset=utf-8" }
    ".css" { return "text/css; charset=utf-8" }
    ".js" { return "application/javascript; charset=utf-8" }
    ".jsx" { return "text/plain; charset=utf-8" }
    ".json" { return "application/json; charset=utf-8" }
    ".svg" { return "image/svg+xml" }
    ".webmanifest" { return "application/manifest+json; charset=utf-8" }
    default { return "application/octet-stream" }
  }
}

while ($listener.IsListening) {
  $context = $listener.GetContext()
  $requestPath = $context.Request.Url.AbsolutePath.TrimStart("/")
  if ([string]::IsNullOrWhiteSpace($requestPath)) {
    $requestPath = "index.html"
  }
  $filePath = Join-Path $root $requestPath
  if (-not (Test-Path $filePath -PathType Leaf)) {
    $filePath = Join-Path $root "index.html"
  }

  try {
    $bytes = [System.IO.File]::ReadAllBytes($filePath)
    $context.Response.StatusCode = 200
    $context.Response.ContentType = Get-ContentType $filePath
    $context.Response.ContentLength64 = $bytes.Length
    $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } catch {
    $message = [System.Text.Encoding]::UTF8.GetBytes("Server error")
    $context.Response.StatusCode = 500
    $context.Response.ContentType = "text/plain; charset=utf-8"
    $context.Response.ContentLength64 = $message.Length
    $context.Response.OutputStream.Write($message, 0, $message.Length)
  } finally {
    $context.Response.OutputStream.Close()
  }
}
