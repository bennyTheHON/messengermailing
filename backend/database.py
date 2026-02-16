from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Enum as SQLEnum, Table
from sqlalchemy.sql import func
import enum
import os
from sqlalchemy.future import select

DATABASE_URL = "sqlite+aiosqlite:///./data/db.sqlite3"

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
Base = declarative_base()

# Enums
class AccountType(enum.Enum):
    TELEGRAM = "telegram"
    EMAIL_IMAP = "email_imap"
    EMAIL_SMTP = "email_smtp"
    WHATSAPP = "whatsapp"

class SourceType(enum.Enum):
    CHANNEL = "channel"
    GROUP = "group"
    PRIVATE_CHAT = "private_chat"
    EMAIL = "email"

# Models
class AdminUser(Base):
    """Admin user with hashed password for web panel authentication"""
    __tablename__ = "admin_users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    two_factor_secret = Column(String, nullable=True)
    two_factor_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class AppSettings(Base):
    """Application-wide settings (singleton table)"""
    __tablename__ = "app_settings"
    id = Column(Integer, primary_key=True)  # Always 1
    # Web settings
    web_port = Column(Integer, default=80)
    # SSL settings
    ssl_enabled = Column(Boolean, default=False)
    ssl_cert_path = Column(String, nullable=True)
    ssl_key_path = Column(String, nullable=True)
    # Global Telegram settings (API credentials)
    telegram_api_id = Column(String, nullable=True)
    telegram_api_hash = Column(String, nullable=True)
    # SMTP Global Settings
    smtp_server = Column(String, nullable=True)
    smtp_port = Column(Integer, default=587)
    smtp_username = Column(String, nullable=True)
    smtp_password = Column(String, nullable=True)
    # Media Forwarding settings
    forward_videos = Column(Boolean, default=True)
    forward_files = Column(Boolean, default=True)
    max_video_size_mb = Column(Integer, default=10)
    # Other
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Account(Base):
    """Connected accounts (Telegram sessions, SMTP servers, IMAP pollers)"""
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    account_type = Column(SQLEnum(AccountType), nullable=False)
    # JSON-encoded credentials or session data
    credentials_json = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Source(Base):
    """Saved sources/chats (for UI convenience)"""
    __tablename__ = "sources"
    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"))
    source_type = Column(SQLEnum(SourceType), nullable=False, default=SourceType.CHANNEL)
    source_id = Column(String, index=True)  # Telegram ID or email
    source_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ForwardingRule(Base):
    """Independent forwarding rules between accounts"""
    __tablename__ = "forwarding_rules"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    source_account_id = Column(Integer, ForeignKey("accounts.id"))
    destination_account_id = Column(Integer, ForeignKey("accounts.id"))
    # JSON filter (e.g., ["-100123456", "user_id"] or {"type": "all"})
    source_filter_json = Column(Text, nullable=True)
    # JSON destination config (e.g., {"email": "to@me.com"} or {"chat_id": "-100..."})
    destination_config_json = Column(Text, nullable=True)
    forwarding_type = Column(String, default="instant") # "instant" or "digest"
    interval_minutes = Column(Integer, default=5)
    enabled = Column(Boolean, default=True)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MessageLog(Base):
    """Log of forwarded messages linked to specific rules"""
    __tablename__ = "message_logs"
    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(Integer, ForeignKey("forwarding_rules.id"))
    source_account_id = Column(Integer, ForeignKey("accounts.id"))
    message_id = Column(String)
    sender_name = Column(String, nullable=True)
    message_content = Column(Text, nullable=True)
    attachment_path = Column(String, nullable=True)
    status = Column(String)  # SENT, FAILED, PENDING
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    scheduled_for = Column(DateTime(timezone=True), nullable=True)

class ScheduleConfig(Base):
    """Global schedule configuration (e.g., for legacy digests or master switch)"""
    __tablename__ = "schedule_config"
    id = Column(Integer, primary_key=True)
    interval_minutes = Column(Integer, default=5)
    enabled = Column(Boolean, default=False)
    last_run_at = Column(DateTime(timezone=True), nullable=True)

# Backward compatibility aliases (deprecated)
Channel = Source

async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def create_initial_admin():
    """Create initial admin user if none exists"""
    from auth_utils import get_password_hash
    async with AsyncSessionLocal() as session:
        # Check if any admin exists
        result = await session.execute(select(AdminUser))
        user = result.scalars().first()
        
        if not user:
            print("Creating initial admin user...")
            admin_username = os.getenv("ADMIN_USERNAME", "admin")
            admin_password = os.getenv("ADMIN_PASSWORD", "admin")
            
            hashed_pw = get_password_hash(admin_password)
            
            new_admin = AdminUser(
                username=admin_username,
                hashed_password=hashed_pw
            )
            
            session.add(new_admin)
            await session.commit()
            print(f"Admin user '{admin_username}' created successfully.")

async def create_initial_settings():
    """Create initial application settings and schedule config from env vars if not exists"""
    async with AsyncSessionLocal() as session:
        # App Settings
        settings_res = await session.execute(select(AppSettings).where(AppSettings.id == 1))
        settings = settings_res.scalar_one_or_none()
        
        if not settings:
            print("Initializing default application settings...")
            settings = AppSettings(
                id=1,
                web_port=int(os.getenv("WEB_PORT", 80)),
                telegram_api_id=os.getenv("TELEGRAM_API_ID"),
                telegram_api_hash=os.getenv("TELEGRAM_API_HASH"),
                ssl_enabled=False
            )
            session.add(settings)
        
        # Schedule Config
        sched_res = await session.execute(select(ScheduleConfig).where(ScheduleConfig.id == 1))
        sched = sched_res.scalar_one_or_none()
        if not sched:
            print("Initializing default schedule configuration...")
            sched = ScheduleConfig(id=1, enabled=False, interval_minutes=5)
            session.add(sched)
            
        await session.commit()
        print("Initial data verification complete.")

async def get_db():
    """Dependency for database sessions"""
    async with AsyncSessionLocal() as session:
        yield session
