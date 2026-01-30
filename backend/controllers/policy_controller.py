from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models.schemas import Policy, PolicyCreate, PolicyUpdate
from services.auth_service import auth_service
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/policies", tags=["Policies"])
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


def create_policy_routes(db: AsyncIOMotorDatabase):
    """Create policy CRUD routes"""
    
    @router.get("/", response_model=List[Policy])
    async def list_policies(active_only: bool = False):
        """List all policies (public endpoint)"""
        query = {"is_active": True} if active_only else {}
        policies = await db.policies.find(query, {"_id": 0}).sort("display_order", 1).to_list(100)
        return policies
    
    @router.get("/slug/{slug}", response_model=Policy)
    async def get_policy_by_slug(slug: str):
        """Get a policy by slug (public endpoint)"""
        policy = await db.policies.find_one({"slug": slug, "is_active": True}, {"_id": 0})
        if not policy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")
        return policy
    
    @router.get("/{policy_id}", response_model=Policy)
    async def get_policy(policy_id: str):
        """Get a specific policy (public endpoint)"""
        policy = await db.policies.find_one({"id": policy_id}, {"_id": 0})
        if not policy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")
        return policy
    
    @router.post("/", response_model=Policy, status_code=status.HTTP_201_CREATED)
    async def create_policy(
        policy_data: PolicyCreate,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Create a new policy (admin only)"""
        await verify_admin(credentials, db)
        
        # Check slug uniqueness
        existing = await db.policies.find_one({"slug": policy_data.slug})
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug already exists")
        
        policy_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        policy_doc = {
            "id": policy_id,
            **policy_data.model_dump(),
            "created_at": now,
            "updated_at": now
        }
        
        await db.policies.insert_one(policy_doc)
        logger.info(f"Created policy: {policy_data.title}")
        
        return await db.policies.find_one({"id": policy_id}, {"_id": 0})
    
    @router.put("/{policy_id}", response_model=Policy)
    async def update_policy(
        policy_id: str,
        policy_data: PolicyUpdate,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Update a policy (admin only)"""
        await verify_admin(credentials, db)
        
        policy = await db.policies.find_one({"id": policy_id})
        if not policy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")
        
        # Check slug uniqueness if updating
        if policy_data.slug:
            existing = await db.policies.find_one({
                "slug": policy_data.slug,
                "id": {"$ne": policy_id}
            })
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug already exists")
        
        update_data = {k: v for k, v in policy_data.model_dump().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.policies.update_one({"id": policy_id}, {"$set": update_data})
        
        return await db.policies.find_one({"id": policy_id}, {"_id": 0})
    
    @router.delete("/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_policy(
        policy_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Delete a policy (admin only)"""
        await verify_admin(credentials, db)
        
        policy = await db.policies.find_one({"id": policy_id})
        if not policy:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")
        
        await db.policies.delete_one({"id": policy_id})
        logger.info(f"Deleted policy: {policy_id}")
    
    return router
