from fastapi import Request, HTTPException, status
from fastapi.responses import Response
import os
import base64

async def basic_auth_middleware(request: Request, call_next):
    """
    Simple Basic Auth Middleware for the web panel (if enabled).
    """
    admin_user = os.getenv("ADMIN_USERNAME")
    admin_pass = os.getenv("ADMIN_PASSWORD")
    
    # If no credentials set, skip auth
    if not admin_user or not admin_pass:
        return await call_next(request)
    
    # Get Authorization header
    auth_header = request.headers.get("Authorization")
    
    if not auth_header or not auth_header.startswith("Basic "):
        return Response(
            content="Unauthorized",
            status_code=status.HTTP_401_UNAUTHORIZED,
            headers={"WWW-Authenticate": "Basic realm=\"Telegram Auto-Forwarder\""}
        )
    
    # Decode credentials
    try:
        encoded_credentials = auth_header.split(" ")[1]
        decoded = base64.b64decode(encoded_credentials).decode("utf-8")
        username, password = decoded.split(":", 1)
        
        if username == admin_user and password == admin_pass:
            return await call_next(request)
    except Exception:
        pass
    
    return Response(
        content="Unauthorized",
        status_code=status.HTTP_401_UNAUTHORIZED,
        headers={"WWW-Authenticate": "Basic realm=\"Telegram Auto-Forwarder\""}
    )
