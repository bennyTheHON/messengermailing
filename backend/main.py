from fastapi import FastAPI
from contextlib import asynccontextmanager
from database import init_db, create_initial_admin, create_initial_settings
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from limiter import limiter
from routers.routing import router as routing_router
from routers.logs import router as logs_router
from routers.accounts import router as accounts_router
from services.account_manager import account_manager
from services.scheduler import start_scheduler
from services.imap_service import imap_service
import os
import logging
from logging.handlers import RotatingFileHandler

# Ensure log directory exists
LOG_DIR = os.path.join(os.path.dirname(__file__), "data", "logs")
os.makedirs(LOG_DIR, exist_ok=True)
BACKEND_LOG_PATH = os.path.join(LOG_DIR, "backend.log")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        RotatingFileHandler(BACKEND_LOG_PATH, maxBytes=10*1024*1024, backupCount=5),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting up...")
    await init_db()
    # Create initial admin user and settings
    await create_initial_admin()
    await create_initial_settings()
    
    # Initialize Account Manager, Scheduler and IMAP service
    await account_manager.start_all()
    start_scheduler()
    await imap_service.start()
    
    yield
    # Shutdown
    print("Shutting down...")
    await account_manager.stop_all()
    await imap_service.stop()

app = FastAPI(lifespan=lifespan, title="messenger2mail Admin Panel")

# Add Limiter to state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        # Prevent XSS attacks
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        # Content Security Policy
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
        # Prevent MIME type sniffing
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

# CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to specific frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add security headers
app.add_middleware(SecurityHeadersMiddleware)

# Include routers
from routers.auth import router as auth_router
from routers.admin import router as admin_router
from routers.schedule import router as schedule_router

app.include_router(auth_router)
app.include_router(accounts_router)
app.include_router(routing_router)
app.include_router(schedule_router)
app.include_router(admin_router)
app.include_router(logs_router)

@app.get("/")
async def read_root():
    return {"status": "running", "service": "messenger2mail Admin Panel"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}
