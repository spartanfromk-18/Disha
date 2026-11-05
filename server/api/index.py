"""Vercel entrypoint: re-export the FastAPI app from nim_proxy.py.

Vercel's Python runtime only serves files under api/, so this thin module
is what Vercel actually imports. The app itself lives in nim_proxy.py.

Routing note (learned the hard way): a catch-all rewrite ("/(.*)") makes
Vercel hand the app the destination path ("/api/index.py") instead of the
URL the user asked for, so no route can ever match. The rewrite in
vercel.json is therefore scoped to "/api/:path*", which preserves the
original path — the app sees "/api/health", and the middleware below
strips the "/api" prefix so the app's own routes (/health, /stt, /tts)
match.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from nim_proxy import app

__all__ = ["app"]


class _StripVercelPrefixMiddleware:
    """Strip a leading /api/index.py or /api from the request path."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            path = scope.get("path", "")
            for prefix in ("/api/index.py", "/api"):
                if path == prefix or path.startswith(prefix + "/"):
                    scope = {**scope, "path": path[len(prefix):] or "/"}
                    break
        await self.app(scope, receive, send)


app.add_middleware(_StripVercelPrefixMiddleware)
