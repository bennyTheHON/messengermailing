"""
Database initialization and migration script
Creates default admin user and initial configuration
"""
import asyncio
from database import engine, Base, AdminUser, AppSettings, ScheduleConfig
from auth_utils import get_password_hash
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select

async def init_database():
    """Initialize database with default data"""
    print("🔧 Initializing database...")
    
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Database tables created")
    
    # Create session
    AsyncSessionLocal = sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with AsyncSessionLocal() as session:
        # Check if admin user exists
        result = await session.execute(select(AdminUser))
        admin = result.scalar_one_or_none()
        
        if not admin:
            # Create default admin user
            default_admin = AdminUser(
                username="admin",
                hashed_password=get_password_hash("admin123")  # Default password
            )
            session.add(default_admin)
            print("✅ Default admin user created (username: admin, password: admin123)")
            print("⚠️  IMPORTANT: Please change the default password immediately!")
        
        # Check if app settings exists
        result = await session.execute(select(AppSettings))
        settings = result.scalar_one_or_none()
        
        if not settings:
            # Create default settings
            default_settings = AppSettings(
                id=1,
                web_port=80,
                ssl_enabled=False
            )
            session.add(default_settings)
            print("✅ Default app settings created")
        
        # Check if schedule config exists
        result = await session.execute(select(ScheduleConfig))
        schedule = result.scalar_one_or_none()
        
        if not schedule:
            # Create default schedule
            default_schedule = ScheduleConfig(
                id=1,
                enabled=False,
                interval_minutes=5
            )
            session.add(default_schedule)
            print("✅ Default schedule configuration created")
        
        await session.commit()
    
    print("🎉 Database initialization complete!")

if __name__ == "__main__":
    asyncio.run(init_database())
