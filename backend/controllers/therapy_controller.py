from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models.schemas import Therapy, TherapyCreate, TherapyUpdate
from services.auth_service import auth_service
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/therapies", tags=["Therapies"])
security = HTTPBearer(auto_error=False)


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


def create_therapy_routes(db: AsyncIOMotorDatabase):
    """Create therapy CRUD routes"""
    
    @router.get("/", response_model=List[Therapy])
    async def list_therapies(active_only: bool = False):
        """List all therapies (public endpoint)"""
        query = {"is_active": True} if active_only else {}
        therapies = await db.therapies.find(query, {"_id": 0}).sort("display_order", 1).to_list(100)
        return therapies
    
    @router.get("/{therapy_id}", response_model=Therapy)
    async def get_therapy(therapy_id: str):
        """Get a specific therapy (public endpoint)"""
        therapy = await db.therapies.find_one({"id": therapy_id}, {"_id": 0})
        if not therapy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Therapy not found")
        return therapy
    
    @router.post("/", response_model=Therapy, status_code=status.HTTP_201_CREATED)
    async def create_therapy(
        therapy_data: TherapyCreate,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Create a new therapy (admin only)"""
        await verify_admin(credentials, db)
        
        therapy_id = str(uuid.uuid4())
        therapy_doc = {
            "id": therapy_id,
            **therapy_data.model_dump(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.therapies.insert_one(therapy_doc)
        logger.info(f"Created therapy: {therapy_data.name}")
        
        return await db.therapies.find_one({"id": therapy_id}, {"_id": 0})
    
    @router.put("/{therapy_id}", response_model=Therapy)
    async def update_therapy(
        therapy_id: str,
        therapy_data: TherapyUpdate,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Update a therapy (admin only)"""
        await verify_admin(credentials, db)
        
        therapy = await db.therapies.find_one({"id": therapy_id})
        if not therapy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Therapy not found")
        
        update_data = {k: v for k, v in therapy_data.model_dump().items() if v is not None}
        
        if update_data:
            await db.therapies.update_one({"id": therapy_id}, {"$set": update_data})
        
        return await db.therapies.find_one({"id": therapy_id}, {"_id": 0})
    
    @router.delete("/{therapy_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_therapy(
        therapy_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Delete a therapy (admin only)"""
        await verify_admin(credentials, db)
        
        therapy = await db.therapies.find_one({"id": therapy_id})
        if not therapy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Therapy not found")
        
        # Also delete associated prices
        await db.prices.delete_many({"therapy_id": therapy_id})
        await db.therapies.delete_one({"id": therapy_id})
        logger.info(f"Deleted therapy: {therapy_id}")
    
    return router
