"""
FitRank frontend server - explicitly sets UTF-8 charset on all text responses
so that the browser never misreads characters.
"""
import http.server
import os
import sys

MIME = {
    ".html": "text/html; charset=utf-8",
    ".js":   "text/javascript; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".png":  "image/png",
    ".svg":  "image/svg+xml",
    ".ico":  "image/x-icon",
    ".webp": "image/webp",
}

class UTF8Handler(http.server.SimpleHTTPRequestHandler):
    def guess_type(self, path):
        _, ext = os.path.splitext(path)
        return MIME.get(ext.lower(), "application/octet-stream")

    def log_message(self, format, *args):
        pass  # silence request logs

port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend"))
print(f"FitRank PWA: http://localhost:{port}", flush=True)
httpd = http.server.HTTPServer(("", port), UTF8Handler)
httpd.serve_forever()
