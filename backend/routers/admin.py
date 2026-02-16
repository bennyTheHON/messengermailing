"""
Admin router - Manage app settings, SSL certificates, and logs
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db, AppSettings
from routers.auth import get_current_user, AdminUser
from pydantic import BaseModel
from typing import Optional
import os
import shutil

router = APIRouter(prefix="/admin", tags=["Admin"])

# Pydantic Models
class AppSettingsUpdate(BaseModel):
    web_port: Optional[int] = None
    smtp_server: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    imap_server: Optional[str] = None
    imap_port: Optional[int] = None
    imap_username: Optional[str] = None
    imap_password: Optional[str] = None
    imap_enabled: Optional[bool] = None
    bidirectional_target_chat: Optional[str] = None
    ssl_cert_path: Optional[str] = None
    ssl_key_path: Optional[str] = None
    ssl_enabled: Optional[bool] = None
    forward_videos: Optional[bool] = None
    forward_files: Optional[bool] = None
    max_video_size_mb: Optional[int] = None

class AppSettingsResponse(BaseModel):
    web_port: int
    ssl_enabled: bool
    ssl_cert_path: Optional[str]
    ssl_key_path: Optional[str]
    forward_videos: bool
    forward_files: bool
    max_video_size_mb: int
    telegram_api_id: Optional[str]
    telegram_api_hash: Optional[str]
    smtp_server: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    setup_complete: bool = False
    
    class Config:
        from_attributes = True

class SystemStatsResponse(BaseModel):
    accounts_count: int
    rules_count: int
    messages_processed: int
    telegram_connected: bool
    active_rules: int

# App Settings Endpoints
@router.get("/settings", response_model=AppSettingsResponse)
async def get_app_settings(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Get application settings"""
    result = await db.execute(select(AppSettings).where(AppSettings.id == 1))
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = AppSettings(id=1, web_port=80, ssl_enabled=False)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    
    # Add calculated field
    settings.setup_complete = bool(settings.telegram_api_id and settings.telegram_api_hash)
    return settings

@router.put("/settings", response_model=AppSettingsResponse)
async def update_app_settings(
    settings_update: AppSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Update application settings"""
    result = await db.execute(select(AppSettings).where(AppSettings.id == 1))
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = AppSettings(id=1)
        db.add(settings)
    
    # Update fields if provided
    update_data = settings_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if hasattr(settings, key):
            setattr(settings, key, value)
    
    await db.commit()
    await db.refresh(settings)
    settings.setup_complete = bool(settings.telegram_api_id and settings.telegram_api_hash)
    return settings

@router.get("/stats", response_model=SystemStatsResponse)
async def get_system_stats(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Get system-wide statistics for the dashboard"""
    from database import Account, ForwardingRule, MessageLog
    from sqlalchemy import func
    
    acc_count = await db.scalar(select(func.count(Account.id)))
    rule_count = await db.scalar(select(func.count(ForwardingRule.id)))
    active_rules = await db.scalar(select(func.count(ForwardingRule.id)).where(ForwardingRule.enabled == True))
    msg_count = await db.scalar(select(func.count(MessageLog.id)))
    
    # Check if any telegram account is active
    tg_active = await db.scalar(select(Account.id).where(Account.is_active == True, Account.account_type == "TELEGRAM"))
    
    return {
        "accounts_count": acc_count or 0,
        "rules_count": rule_count or 0,
        "active_rules": active_rules or 0,
        "messages_processed": msg_count or 0,
        "telegram_connected": bool(tg_active)
    }

# SSL Certificate Management
@router.post("/ssl/upload")
async def upload_ssl_certificates(
    fullchain: UploadFile = File(...),
    privkey: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Upload SSL certificate files"""
    ssl_dir = "/app/ssl"  # Inside Docker container
    os.makedirs(ssl_dir, exist_ok=True)
    
    fullchain_path = os.path.join(ssl_dir, "fullchain.pem")
    privkey_path = os.path.join(ssl_dir, "privkey.pem")
    
    # Save files
    with open(fullchain_path, "wb") as f:
        shutil.copyfileobj(fullchain.file, f)
    
    with open(privkey_path, "wb") as f:
        shutil.copyfileobj(privkey.file, f)
    
    # Set restrictive permissions
    os.chmod(fullchain_path, 0o600)
    os.chmod(privkey_path, 0o600)
    
    # Update database
    result = await db.execute(select(AppSettings).where(AppSettings.id == 1))
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = AppSettings(id=1)
        db.add(settings)
    
    settings.ssl_enabled = True
    settings.ssl_cert_path = fullchain_path
    settings.ssl_key_path = privkey_path
    
    await db.commit()
    
    return {"status": "uploaded", "ssl_enabled": True}

from cryptography import x509
from cryptography.hazmat.backends import default_backend

@router.get("/ssl/info")
async def get_ssl_info(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Get SSL certificate details"""
    result = await db.execute(select(AppSettings).where(AppSettings.id == 1))
    settings = result.scalar_one_or_none()
    
    cert_path = settings.ssl_cert_path if settings and settings.ssl_cert_path else "/app/ssl/fullchain.pem"
    
    if not os.path.exists(cert_path):
        return {"exists": False}
    
    try:
        with open(cert_path, "rb") as f:
            cert_data = f.read()
            cert = x509.load_pem_x509_certificate(cert_data, default_backend())
            
            # Extract Common Name (Domain)
            try:
                domain = cert.subject.get_attributes_for_oid(x509.NameOID.COMMON_NAME)[0].value
            except:
                domain = "Unknown"
                
            try:
                issuer = cert.issuer.get_attributes_for_oid(x509.NameOID.COMMON_NAME)[0].value
            except:
                issuer = "Unknown"
            
            return {
                "exists": True,
                "domain": domain,
                "issuer": issuer,
                "expires_at": cert.not_valid_after.isoformat(),
                "path": cert_path
            }
    except Exception as e:
        return {"exists": True, "error": str(e)}

@router.delete("/ssl")
async def remove_ssl(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Remove SSL certificate configuration"""
    result = await db.execute(select(AppSettings).where(AppSettings.id == 1))
    settings = result.scalar_one_or_none()
    
    if settings:
        # Remove files if they exist
        if settings.ssl_cert_path and os.path.exists(settings.ssl_cert_path):
            os.remove(settings.ssl_cert_path)
        if settings.ssl_key_path and os.path.exists(settings.ssl_key_path):
            os.remove(settings.ssl_key_path)
        
        settings.ssl_enabled = False
        settings.ssl_cert_path = None
        settings.ssl_key_path = None
        
        await db.commit()
    
    return {"status": "removed"}

# Log Downloads
@router.get("/logs/backend")
async def download_backend_logs(
    current_user: AdminUser = Depends(get_current_user)
):
    """Download backend logs"""
    log_path = "/app/data/logs/backend.log"
    if not os.path.exists(log_path):
        return Response(content="No backend logs found.", media_type="text/plain")
    
    with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
        log_content = f.read()
    
    return Response(
        content=log_content,
        media_type="text/plain",
        headers={"Content-Disposition": "attachment; filename=backend.log"}
    )

@router.get("/logs/frontend")
async def download_frontend_logs(
    current_user: AdminUser = Depends(get_current_user)
):
    """Download frontend (nginx) logs"""
    log_path = "/var/log/nginx/access.log"
    if not os.path.exists(log_path):
        # Try error log if access log is empty/missing
        log_path = "/var/log/nginx/error.log"
    
    if not os.path.exists(log_path):
        return Response(content="No frontend logs found.", media_type="text/plain")
    
    try:
        with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
            log_content = f.read()
    except Exception as e:
        log_content = f"Error reading frontend logs: {str(e)}"
    
    return Response(
        content=log_content,
        media_type="text/plain",
        headers={"Content-Disposition": "attachment; filename=frontend.log"}
    )
