"""
Schedule router - Manage message forwarding schedule
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db, ScheduleConfig
from routers.auth import get_current_user, AdminUser
from pydantic import BaseModel
from services.scheduler import scheduler_service

router = APIRouter(prefix="/schedule", tags=["Schedule"])

# Pydantic Models
class ScheduleConfigUpdate(BaseModel):
    interval_minutes: int
    enabled: bool

class ScheduleConfigResponse (BaseModel):
    enabled: bool
    interval_minutes: int
    last_run_at: Optional[str] = None
    
    class Config:
        from_attributes = True

@router.get("/config", response_model=ScheduleConfigResponse)
async def get_schedule_config(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Get current schedule configuration"""
    result = await db.execute(select(ScheduleConfig).where(ScheduleConfig.id == 1))
    config = result.scalar_one_or_none()
    
    if not config:
        # Create default config
        config = ScheduleConfig(id=1, enabled=False, interval_minutes=5)
        db.add(config)
        await db.commit()
        await db.refresh(config)
    
    return {
        "enabled": config.enabled,
        "interval_minutes": config.interval_minutes,
        "last_run_at": config.last_run_at.isoformat() if config.last_run_at else None
    }

@router.put("/config")
async def update_schedule_config(
    config_update: ScheduleConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Update schedule configuration"""
    if config_update.interval_minutes < 1:
        raise HTTPException(status_code=400, detail="Interval must be at least 1 minute")
    
    result = await db.execute(select(ScheduleConfig).where(ScheduleConfig.id == 1))
    config = result.scalar_one_or_none()
    
    if not config:
        config = ScheduleConfig(id=1)
        db.add(config)
    
    config.interval_minutes = config_update.interval_minutes
    config.enabled = config_update.enabled
    
    await db.commit()
    await db.refresh(config)
    
    # Update the scheduler
    scheduler_service.update_interval(config_update.interval_minutes, config_update.enabled)
    
    return {"status": "updated", "interval_minutes": config.interval_minutes, "enabled": config.enabled}

@router.post("/start")
async def start_schedule(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Enable scheduler"""
    result = await db.execute(select(ScheduleConfig).where(ScheduleConfig.id == 1))
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(status_code=404, detail="Schedule config not found")
    
    config.enabled = True
    await db.commit()
    
    # CRITICAL: Start the scheduler engine AND add the job with correct interval
    scheduler_service.start()
    scheduler_service.update_interval(config.interval_minutes, True)
    
    return {"status": "started", "interval_minutes": config.interval_minutes}

@router.post("/stop")
async def stop_schedule(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Disable scheduler"""
    result = await db.execute(select(ScheduleConfig).where(ScheduleConfig.id == 1))
    config = result.scalar_one_or_none()
    
    if not config:
        raise HTTPException(status_code=404, detail="Schedule config not found")
    
    config.enabled = False
    await db.commit()
    
    scheduler_service.stop()
    
    return {"status": "stopped"}
