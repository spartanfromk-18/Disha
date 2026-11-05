"""Vercel entrypoint: re-export the FastAPI app from nim_proxy.py.

Vercel's Python runtime only serves files under api/, so this thin module
is what Vercel actually imports. The app itself lives in nim_proxy.py.

NOTE: Vercel's rewrite sends every request to this file, and the app sees
the rewritten path ("/api/index.py...") instead of the original URL. The
middleware below strips that prefix so /health, /stt and /tts route
normally. If Vercel ever passes the original path, the middleware is a
no-op.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from nim_proxy import app

__all__ = ["app"]


class _StripVercelPrefixMiddleware:
    """Remove a leading /api/index.py from the request path, if present."""

    def __init__(self, app, prefix="/api/index.py"):
        self.app = app
        self.prefix = prefix

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            path = scope.get("path", "")
            if path.startswith(self.prefix):
                scope = {**scope, "path": path[len(self.prefix):] or "/"}
        await self.app(scope, receive, send)


app.add_middleware(_StripVercelPrefixMiddleware)
