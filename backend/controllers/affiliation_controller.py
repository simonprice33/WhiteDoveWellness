from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models.schemas import Affiliation, AffiliationCreate, AffiliationUpdate
from services.auth_service import auth_service
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/affiliations", tags=["Affiliations"])
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


def create_affiliation_routes(db: AsyncIOMotorDatabase):
    """Create affiliation CRUD routes"""
    
    @router.get("/", response_model=List[Affiliation])
    async def list_affiliations(active_only: bool = False):
        """List all affiliations (public endpoint)"""
        query = {"is_active": True} if active_only else {}
        affiliations = await db.affiliations.find(query, {"_id": 0}).sort("display_order", 1).to_list(100)
        return affiliations
    
    @router.get("/{affiliation_id}", response_model=Affiliation)
    async def get_affiliation(affiliation_id: str):
        """Get a specific affiliation (public endpoint)"""
        affiliation = await db.affiliations.find_one({"id": affiliation_id}, {"_id": 0})
        if not affiliation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Affiliation not found")
        return affiliation
    
    @router.post("/", response_model=Affiliation, status_code=status.HTTP_201_CREATED)
    async def create_affiliation(
        affiliation_data: AffiliationCreate,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Create a new affiliation (admin only)"""
        await verify_admin(credentials, db)
        
        affiliation_id = str(uuid.uuid4())
        affiliation_doc = {
            "id": affiliation_id,
            **affiliation_data.model_dump(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.affiliations.insert_one(affiliation_doc)
        logger.info(f"Created affiliation: {affiliation_data.name}")
        
        return await db.affiliations.find_one({"id": affiliation_id}, {"_id": 0})
    
    @router.put("/{affiliation_id}", response_model=Affiliation)
    async def update_affiliation(
        affiliation_id: str,
        affiliation_data: AffiliationUpdate,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Update an affiliation (admin only)"""
        await verify_admin(credentials, db)
        
        affiliation = await db.affiliations.find_one({"id": affiliation_id})
        if not affiliation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Affiliation not found")
        
        update_data = {k: v for k, v in affiliation_data.model_dump().items() if v is not None}
        
        if update_data:
            await db.affiliations.update_one({"id": affiliation_id}, {"$set": update_data})
        
        return await db.affiliations.find_one({"id": affiliation_id}, {"_id": 0})
    
    @router.delete("/{affiliation_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_affiliation(
        affiliation_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Delete an affiliation (admin only)"""
        await verify_admin(credentials, db)
        
        affiliation = await db.affiliations.find_one({"id": affiliation_id})
        if not affiliation:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Affiliation not found")
        
        await db.affiliations.delete_one({"id": affiliation_id})
        logger.info(f"Deleted affiliation: {affiliation_id}")
    
    return router
