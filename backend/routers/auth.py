"""
Authentication router - Login, logout, password management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from database import get_db, AdminUser
from auth_utils import verify_password, get_password_hash, create_access_token, decode_access_token
from limiter import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# Pydantic models
class Token(BaseModel):
    access_token: str
    token_type: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class UserInfo(BaseModel):
    username: str
    two_factor_enabled: bool

class TwoFactorSetupResponse(BaseModel):
    secret: str
    qr_code: str  # Base64 encoded image data

class TwoFactorVerifyRequest(BaseModel):
    code: str

class LoginRequest(BaseModel):
    username: str
    password: str
    two_factor_code: Optional[str] = None

# Dependency to get current user from JWT
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> AdminUser:
    """Validate JWT token and return current user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    username: Optional[str] = payload.get("sub")
    if username is None:
        raise credentials_exception
    
    result = await db.execute(select(AdminUser).where(AdminUser.username == username))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    return user

@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """Authenticate user and return JWT token with optional 2FA"""
    # Find user
    result = await db.execute(select(AdminUser).where(AdminUser.username == form_data.username))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 2FA Check
    if user.two_factor_enabled:
        # Check for code in a custom header or extract from a different request format if needed
        # Since OAuth2PasswordRequestForm doesn't support extra fields, we'll check for 2FA code
        # in a special header 'X-2FA-Code' if provided by the frontend.
        two_factor_code = request.headers.get("X-2FA-Code")
        
        if not two_factor_code:
            return Response(
                status_code=status.HTTP_403_FORBIDDEN,
                content='{"detail": "2FA_REQUIRED"}'
            )
        
        totp = pyotp.TOTP(user.two_factor_secret)
        if not totp.verify(two_factor_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid 2FA code"
            )
    
    # Create access token
    access_token = create_access_token(data={"sub": user.username})
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/logout")
async def logout(current_user: AdminUser = Depends(get_current_user)):
    """Logout user (client-side token removal)"""
    # In JWT, logout is handled client-side by removing the token
    # For more security, implement token blacklisting
    return {"message": "Successfully logged out"}

@router.post("/change-password")
@limiter.limit("5/minute")
async def change_password(
    request: Request,
    password_request: ChangePasswordRequest,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Change user password"""
    # Verify current password
    if not verify_password(password_request.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.hashed_password = get_password_hash(password_request.new_password)
    await db.commit()
    
    return {"message": "Password changed successfully"}

@router.get("/me", response_model=UserInfo)
async def get_current_user_info(current_user: AdminUser = Depends(get_current_user)):
    """Get current user information"""
    return {
        "username": current_user.username,
        "two_factor_enabled": current_user.two_factor_enabled
    }

# 2FA Endpoints
import pyotp
import qrcode
import io
import base64

@router.post("/2fa/setup", response_model=TwoFactorSetupResponse)
async def setup_2fa(
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate 2FA secret and QR code"""
    if current_user.two_factor_enabled:
        raise HTTPException(status_code=400, detail="2FA is already enabled")
    
    # Generate secret if not exists
    if not current_user.two_factor_secret:
        current_user.two_factor_secret = pyotp.random_base32()
        await db.commit()
    
    # Create provision URI for QR code
    totp = pyotp.TOTP(current_user.two_factor_secret)
    provision_uri = totp.provisioning_uri(
        name=current_user.username, 
        issuer_name="messenger2mail"
    )
    
    # Generate QR Code image
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(provision_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    qr_base64 = base64.b64encode(buffered.getvalue()).decode()
    
    return {
        "secret": current_user.two_factor_secret,
        "qr_code": f"data:image/png;base64,{qr_base64}"
    }

@router.post("/2fa/enable")
async def enable_2fa(
    verify_request: TwoFactorVerifyRequest,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Verify code and enable 2FA"""
    if not current_user.two_factor_secret:
        raise HTTPException(status_code=400, detail="2FA setup not initiated")
    
    totp = pyotp.TOTP(current_user.two_factor_secret)
    if totp.verify(verify_request.code):
        current_user.two_factor_enabled = True
        await db.commit()
        return {"message": "2FA enabled successfully"}
    else:
        raise HTTPException(status_code=400, detail="Invalid verification code")

@router.post("/2fa/disable")
async def disable_2fa(
    verify_request: TwoFactorVerifyRequest,
    current_user: AdminUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Disable 2FA after verification"""
    totp = pyotp.TOTP(current_user.two_factor_secret)
    if totp.verify(verify_request.code):
        current_user.two_factor_enabled = False
        current_user.two_factor_secret = None
        await db.commit()
        return {"message": "2FA disabled successfully"}
    else:
        raise HTTPException(status_code=400, detail="Invalid verification code")
