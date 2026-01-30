from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models.schemas import SiteSettings, SocialLinks
from services.auth_service import auth_service
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/settings", tags=["Settings"])
security = HTTPBearer(auto_error=False)


class SettingsUpdate(BaseModel):
    business_name: Optional[str] = None
    tagline: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    social_links: Optional[SocialLinks] = None


async def verify_admin(credentials: HTTPAuthorizationCredentials, db: AsyncIOMotorDatabase) -> dict:
    """Verify admin user from token"""
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    
    payload = auth_service.decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    user = await db.admin_users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user or not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or disabled")
    
    return user


def create_settings_routes(db: AsyncIOMotorDatabase):
    """Create settings routes"""
    
    @router.get("/", response_model=SiteSettings)
    async def get_settings():
        """Get site settings (public endpoint)"""
        settings = await db.site_settings.find_one({"id": "site_settings"}, {"_id": 0})
        
        if not settings:
            # Return default settings
            default = SiteSettings()
            return default
        
        return settings
    
    @router.put("/", response_model=SiteSettings)
    async def update_settings(
        settings_data: SettingsUpdate,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Update site settings (admin only)"""
        await verify_admin(credentials, db)
        
        update_data = {k: v for k, v in settings_data.model_dump().items() if v is not None}
        if "social_links" in update_data and update_data["social_links"]:
            update_data["social_links"] = update_data["social_links"].model_dump() if hasattr(update_data["social_links"], 'model_dump') else update_data["social_links"]
        
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        update_data["id"] = "site_settings"
        
        await db.site_settings.update_one(
            {"id": "site_settings"},
            {"$set": update_data},
            upsert=True
        )
        
        logger.info("Site settings updated")
        return await db.site_settings.find_one({"id": "site_settings"}, {"_id": 0})
    
    return router
