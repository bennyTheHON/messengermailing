from fastapi import APIRouter, Depends, HTTPException, Request
import os
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from database import get_db, Account, AccountType
from routers.auth import get_current_user, AdminUser
from pydantic import BaseModel
from typing import List, Optional
from services.account_manager import account_manager
from limiter import limiter

router = APIRouter(prefix="/accounts", tags=["Accounts"])

class AccountCreate(BaseModel):
    name: str
    account_type: str # "telegram", "email_imap", "email_smtp"
    credentials_json: Optional[str] = None

class AccountResponse(BaseModel):
    id: int
    name: str
    account_type: str
    is_active: bool
    
    class Config:
        from_attributes = True

class PhoneRequest(BaseModel):
    account_id: int
    phone: str

class LoginRequest(BaseModel):
    account_id: int
    code: str
    password: Optional[str] = None

@router.get("", response_model=List[AccountResponse])
async def get_accounts(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    result = await db.execute(select(Account))
    return result.scalars().all()

@router.post("", response_model=AccountResponse)
async def create_account(
    data: AccountCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    try:
        acc_type = AccountType(data.account_type)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid account type")
        
    is_active = False
    
    if acc_type == AccountType.TELEGRAM:
        is_active = False # Needs login
    elif acc_type in [AccountType.EMAIL_IMAP, AccountType.EMAIL_SMTP]:
        # Validate credentials immediately
        if not data.credentials_json:
            raise HTTPException(status_code=400, detail="Email credentials required")
            
        try:
            creds = json.loads(data.credentials_json)
            import imaplib, smtplib
            
            if acc_type == AccountType.EMAIL_IMAP:
                server = imaplib.IMAP4_SSL(creds.get("host"), int(creds.get("port", 993)))
                server.login(creds.get("user"), creds.get("password"))
                server.logout()
            elif acc_type == AccountType.EMAIL_SMTP:
                server = smtplib.SMTP_SSL(creds.get("host"), int(creds.get("port", 465)))
                server.login(creds.get("user"), creds.get("password"))
                server.quit()
                
            is_active = True
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")

    account = Account(
        name=data.name,
        account_type=acc_type,
        credentials_json=data.credentials_json,
        is_active=is_active
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account

@router.delete("/{account_id}")
async def delete_account(
    account_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    # Stop client first
    if account_id in account_manager.telegram_clients:
        await account_manager.telegram_clients[account_id].disconnect()
        del account_manager.telegram_clients[account_id]
        
    await db.execute(delete(Account).where(Account.id == account_id))
    await db.commit()
    return {"status": "deleted"}

@router.post("/telegram/send-code")
@limiter.limit("2/minute")
async def send_code(
    request: Request,
    data: PhoneRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    result = await db.execute(select(Account).where(Account.id == data.account_id))
    account = result.scalar_one_or_none()
    if not account or account.account_type != AccountType.TELEGRAM:
        raise HTTPException(status_code=404, detail="Account not found or not Telegram")
    
    # Get or start service
    service = account_manager.telegram_services.get(data.account_id)
    if not service:
        from services.telegram_client import TelegramService
        service = TelegramService(data.account_id)
        account_manager.telegram_services[data.account_id] = service
        # Start only basic client connection
        from database import AppSettings
        s_res = await db.execute(select(AppSettings).where(AppSettings.id == 1))
        settings = s_res.scalar_one_or_none()
        if not settings: raise HTTPException(status_code=500, detail="Global settings missing")
        service.api_id = settings.telegram_api_id
        service.api_hash = settings.telegram_api_hash
        
        session_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'sessions', f'account_{data.account_id}')
        from telethon import TelegramClient
        service.client = TelegramClient(session_file, int(service.api_id), service.api_hash)
        await service.client.connect()

    res = await service.send_code(data.phone)
    if res["status"] == "error":
        raise HTTPException(status_code=400, detail=res["message"])
    return res

@router.post("/telegram/login")
async def login_telegram(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    service = account_manager.telegram_services.get(data.account_id)
    if not service or not service.client:
        raise HTTPException(status_code=400, detail="Client not started. Call send-code first.")
        
    res = await service.sign_in(data.code, data.password)
    if res["status"] == "error":
        raise HTTPException(status_code=400, detail=res["message"])
    return res

@router.get("/{account_id}/dialogs")
async def get_account_dialogs(
    account_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Fetch available chats for a specific Telegram account"""
    client = await account_manager.get_client(account_id)
    if not client:
        # Try to start it
        res = await db.execute(select(Account).where(Account.id == account_id))
        account = res.scalar_one_or_none()
        if account and account.account_type == AccountType.TELEGRAM:
            client = await account_manager.start_telegram_account(account)
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not active")
        
    try:
        dialogs = []
        async for dialog in client.iter_dialogs():
            dialogs.append({
                "source_id": str(dialog.id),
                "source_name": dialog.name,
                "source_type": "channel" if dialog.is_channel else "group" if dialog.is_group else "private"
            })
        return dialogs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{account_id}/test")
async def test_account_connection(
    account_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Test connection for a specific account (IMAP or SMTP)"""
    result = await db.execute(select(Account).where(Account.id == account_id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
        
    if not account.credentials_json:
        raise HTTPException(status_code=400, detail="Account has no credentials")
        
    try:
        creds = json.loads(account.credentials_json)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid credentials format")
        
    import imaplib
    import smtplib
    
    try:
        if account.account_type == AccountType.EMAIL_IMAP:
            # Test IMAP
            server = imaplib.IMAP4_SSL(creds.get("host"), int(creds.get("port", 993)))
            server.login(creds.get("username"), creds.get("password"))
            server.logout()
            return {"status": "success", "message": "IMAP connection successful"}
            
        elif account.account_type == AccountType.EMAIL_SMTP:
            # Test SMTP
            server = smtplib.SMTP_SSL(creds.get("host"), int(creds.get("port", 465)))
            server.login(creds.get("username"), creds.get("password"))
            server.quit()
            return {"status": "success", "message": "SMTP connection successful"}
            
        else:
            return {"status": "error", "message": "Testing only supported for Email accounts"}
            
    except Exception as e:
        return {"status": "error", "message": str(e)}
