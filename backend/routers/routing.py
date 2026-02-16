"""
Routing router - Manage sources, emails, and unified forwarding rules (Instant/Digest)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from database import get_db, Source, SourceType, ForwardingRule
from routers.auth import get_current_user, AdminUser
from pydantic import BaseModel, EmailStr
from typing import List, Optional

router = APIRouter(prefix="/routing", tags=["Routing"])

# Pydantic Models for Sources
class SourceCreate(BaseModel):
    source_type: str  # "channel", "group", "private_chat"
    source_id: str
    source_name: Optional[str] = None

class SourceResponse(BaseModel):
    id: int
    source_type: str
    source_id: str
    source_name: Optional[str]
    is_active: bool
    
    class Config:
        from_attributes = True

# Pydantic Models for Emails
class EmailCreate(BaseModel):
    email: EmailStr

class EmailResponse(BaseModel):
    id: int
    email: str
    is_active: bool
    
    class Config:
        from_attributes = True

# Pydantic Models for Advanced Rules
class RoutingRuleBase(BaseModel):
    name: Optional[str] = None
    source_account_id: int
    destination_account_id: int
    source_filter_json: Optional[str] = None
    destination_config_json: Optional[str] = None
    forwarding_type: str = "instant" # "instant" or "digest"
    interval_minutes: int = 5
    enabled: bool = True

class RoutingRuleCreate(RoutingRuleBase):
    pass

class RoutingRuleResponse(RoutingRuleBase):
    id: int
    class Config:
        from_attributes = True

# Sources Endpoints
@router.get("/sources", response_model=List[SourceResponse])
async def get_sources(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Get all sources"""
    result = await db.execute(select(Source))
    sources = result.scalars().all()
    return [
        {
            "id": s.id,
            "source_type": s.source_type.value,
            "source_id": s.source_id,
            "source_name": s.source_name,
            "is_active": s.is_active
        }
        for s in sources
    ]

@router.post("/sources", response_model=SourceResponse)
async def add_source(
    source: SourceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Add a new source"""
    try:
        source_type_enum = SourceType(source.source_type)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid source type.")
    
    db_source = Source(
        source_type=source_type_enum,
        source_id=source.source_id,
        source_name=source.source_name
    )
    db.add(db_source)
    try:
        await db.commit()
        await db.refresh(db_source)
        return {
            "id": db_source.id,
            "source_type": db_source.source_type.value,
            "source_id": db_source.source_id,
            "source_name": db_source.source_name,
            "is_active": db_source.is_active
        }
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Source already exists.")

@router.delete("/sources/{source_id}")
async def delete_source(
    source_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Delete a source"""
    await db.execute(delete(Source).where(Source.id == source_id))
    await db.commit()
    return {"status": "deleted"}

# Emails Endpoints
@router.get("/emails", response_model=List[EmailResponse])
async def get_emails(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Get all saved email sources (Legacy support via Source model)"""
    result = await db.execute(select(Source).where(Source.source_type == SourceType.EMAIL))
    sources = result.scalars().all()
    return [{"id": s.id, "email": s.source_id, "is_active": s.is_active} for s in sources]

@router.post("/emails", response_model=EmailResponse)
async def add_email(
    email: EmailCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Add a new email source"""
    db_email = Source(source_id=email.email, source_type=SourceType.EMAIL, source_name=email.email)
    db.add(db_email)
    try:
        await db.commit()
        await db.refresh(db_email)
        return {"id": db_email.id, "email": db_email.source_id, "is_active": db_email.is_active}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Email source already exists.")

@router.delete("/emails/{email_id}")
async def delete_email(
    email_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Delete an email source"""
    await db.execute(delete(Source).where(Source.id == email_id, Source.source_type == SourceType.EMAIL))
    await db.commit()
    return {"status": "deleted"}

# Unified Routing Rules Endpoints
@router.get("/rules", response_model=List[RoutingRuleResponse])
async def get_rules(
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Get all forwarding rules (Instant & Digest)"""
    result = await db.execute(select(ForwardingRule))
    return result.scalars().all()

@router.post("/rules", response_model=RoutingRuleResponse)
async def create_rule(
    rule_data: RoutingRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Create a new forwarding rule"""
    rule = ForwardingRule(**rule_data.model_dump())
    db.add(rule)
    try:
        await db.commit()
        await db.refresh(rule)
        return rule
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/rules/{rule_id}", response_model=RoutingRuleResponse)
async def update_rule(
    rule_id: int,
    rule_data: RoutingRuleBase,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Update a forwarding rule"""
    result = await db.execute(select(ForwardingRule).where(ForwardingRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    for key, value in rule_data.model_dump().items():
        setattr(rule, key, value)
    
    await db.commit()
    await db.refresh(rule)
    return rule

@router.delete("/rules/{rule_id}")
async def delete_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: AdminUser = Depends(get_current_user)
):
    """Delete a forwarding rule"""
    await db.execute(delete(ForwardingRule).where(ForwardingRule.id == rule_id))
    await db.commit()
    return {"status": "deleted"}
