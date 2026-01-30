from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models.schemas import AdminUser, AdminUserCreate, AdminUserUpdate
from services.auth_service import auth_service
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin-users", tags=["Admin Users"])
security = HTTPBearer()


async def verify_admin(credentials: HTTPAuthorizationCredentials, db: AsyncIOMotorDatabase) -> dict:
    """Verify admin user from token"""
    payload = auth_service.decode_token(credentials.credentials)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    user = await db.admin_users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user or not user.get("is_active", True):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or disabled")
    
    return user


def create_admin_user_routes(db: AsyncIOMotorDatabase):
    """Create admin user management routes"""
    
    @router.get("/", response_model=List[AdminUser])
    async def list_admin_users(credentials: HTTPAuthorizationCredentials = Depends(security)):
        """List all admin users"""
        await verify_admin(credentials, db)
        users = await db.admin_users.find({}, {"_id": 0, "password_hash": 0}).to_list(100)
        return users
    
    @router.post("/", response_model=AdminUser, status_code=status.HTTP_201_CREATED)
    async def create_admin_user(
        user_data: AdminUserCreate,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Create a new admin user"""
        await verify_admin(credentials, db)
        
        # Check if username or email exists
        existing = await db.admin_users.find_one({
            "$or": [
                {"username": user_data.username},
                {"email": user_data.email}
            ]
        })
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email already exists"
            )
        
        # Create user
        user_id = str(uuid.uuid4())
        user_doc = {
            "id": user_id,
            "username": user_data.username,
            "email": user_data.email,
            "password_hash": auth_service.hash_password(user_data.password),
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.admin_users.insert_one(user_doc)
        logger.info(f"Created admin user: {user_data.username}")
        
        # Return without password
        del user_doc["password_hash"]
        return user_doc
    
    @router.get("/{user_id}", response_model=AdminUser)
    async def get_admin_user(
        user_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Get a specific admin user"""
        await verify_admin(credentials, db)
        
        user = await db.admin_users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        return user
    
    @router.put("/{user_id}", response_model=AdminUser)
    async def update_admin_user(
        user_id: str,
        user_data: AdminUserUpdate,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Update an admin user"""
        current_user = await verify_admin(credentials, db)
        
        # Check if user exists
        user = await db.admin_users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        # Build update dict
        update_data = {}
        if user_data.username:
            # Check uniqueness
            existing = await db.admin_users.find_one({
                "username": user_data.username,
                "id": {"$ne": user_id}
            })
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already exists")
            update_data["username"] = user_data.username
        
        if user_data.email:
            existing = await db.admin_users.find_one({
                "email": user_data.email,
                "id": {"$ne": user_id}
            })
            if existing:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already exists")
            update_data["email"] = user_data.email
        
        if user_data.password:
            update_data["password_hash"] = auth_service.hash_password(user_data.password)
        
        if user_data.is_active is not None:
            # Prevent disabling yourself
            if user_id == current_user["id"] and not user_data.is_active:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot disable your own account")
            update_data["is_active"] = user_data.is_active
        
        if update_data:
            await db.admin_users.update_one({"id": user_id}, {"$set": update_data})
        
        updated = await db.admin_users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        return updated
    
    @router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_admin_user(
        user_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Delete an admin user"""
        current_user = await verify_admin(credentials, db)
        
        # Prevent self-deletion
        if user_id == current_user["id"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own account")
        
        # Check if user exists
        user = await db.admin_users.find_one({"id": user_id})
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        await db.admin_users.delete_one({"id": user_id})
        logger.info(f"Deleted admin user: {user_id}")
    
    return router
