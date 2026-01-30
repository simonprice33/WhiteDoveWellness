from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models.schemas import Price, PriceCreate, PriceUpdate
from services.auth_service import auth_service
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/prices", tags=["Prices"])
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


def create_price_routes(db: AsyncIOMotorDatabase):
    """Create price CRUD routes"""
    
    @router.get("/", response_model=List[Price])
    async def list_prices(therapy_id: str = None, active_only: bool = False):
        """List all prices (public endpoint)"""
        query = {}
        if therapy_id:
            query["therapy_id"] = therapy_id
        if active_only:
            query["is_active"] = True
        
        prices = await db.prices.find(query, {"_id": 0}).sort("display_order", 1).to_list(100)
        return prices
    
    @router.get("/{price_id}", response_model=Price)
    async def get_price(price_id: str):
        """Get a specific price (public endpoint)"""
        price = await db.prices.find_one({"id": price_id}, {"_id": 0})
        if not price:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Price not found")
        return price
    
    @router.post("/", response_model=Price, status_code=status.HTTP_201_CREATED)
    async def create_price(
        price_data: PriceCreate,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Create a new price (admin only)"""
        await verify_admin(credentials, db)
        
        # Verify therapy exists
        therapy = await db.therapies.find_one({"id": price_data.therapy_id})
        if not therapy:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Therapy not found")
        
        price_id = str(uuid.uuid4())
        price_doc = {
            "id": price_id,
            **price_data.model_dump(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.prices.insert_one(price_doc)
        logger.info(f"Created price: {price_data.name}")
        
        return await db.prices.find_one({"id": price_id}, {"_id": 0})
    
    @router.put("/{price_id}", response_model=Price)
    async def update_price(
        price_id: str,
        price_data: PriceUpdate,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Update a price (admin only)"""
        await verify_admin(credentials, db)
        
        price = await db.prices.find_one({"id": price_id})
        if not price:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Price not found")
        
        # If updating therapy_id, verify it exists
        if price_data.therapy_id:
            therapy = await db.therapies.find_one({"id": price_data.therapy_id})
            if not therapy:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Therapy not found")
        
        update_data = {k: v for k, v in price_data.model_dump().items() if v is not None}
        
        if update_data:
            await db.prices.update_one({"id": price_id}, {"$set": update_data})
        
        return await db.prices.find_one({"id": price_id}, {"_id": 0})
    
    @router.delete("/{price_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_price(
        price_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Delete a price (admin only)"""
        await verify_admin(credentials, db)
        
        price = await db.prices.find_one({"id": price_id})
        if not price:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Price not found")
        
        await db.prices.delete_one({"id": price_id})
        logger.info(f"Deleted price: {price_id}")
    
    return router
