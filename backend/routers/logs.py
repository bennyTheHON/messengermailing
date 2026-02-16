from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db, MessageLog
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/logs", tags=["Logs"])

class LogResponse(BaseModel):
    id: int
    source_id: str
    message_id: int
    sender_name: Optional[str]
    message_content: Optional[str]
    attachment_path: Optional[str]
    status: str
    created_at: Optional[datetime]
    scheduled_for: Optional[datetime]

    class Config:
        from_attributes = True

@router.get("/", response_model=List[LogResponse])
async def get_logs(limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(MessageLog).order_by(MessageLog.created_at.desc()).limit(limit))
    return result.scalars().all()
