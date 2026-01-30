from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models.schemas import LoginRequest, TokenResponse, TokenRefresh
from services.auth_service import auth_service
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["Authentication"])
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncIOMotorDatabase = None
) -> dict:
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    payload = auth_service.decode_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return payload


def create_auth_routes(db: AsyncIOMotorDatabase):
    """Create authentication routes with database dependency"""
    
    @router.post("/login", response_model=TokenResponse)
    async def login(request: LoginRequest):
        """Authenticate user and return tokens"""
        # Find user
        user = await db.admin_users.find_one({"username": request.username}, {"_id": 0})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        if not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is disabled"
            )
        
        if not auth_service.verify_password(request.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        # Create tokens
        tokens = auth_service.create_tokens(user["id"], user["username"])
        logger.info(f"User {request.username} logged in successfully")
        
        return TokenResponse(**tokens)
    
    @router.post("/refresh", response_model=TokenResponse)
    async def refresh_token(request: TokenRefresh):
        """Refresh access token using refresh token"""
        payload = auth_service.decode_token(request.refresh_token)
        
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token"
            )
        
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        # Verify user still exists and is active
        user = await db.admin_users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user or not user.get("is_active", True):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or disabled"
            )
        
        # Create new tokens
        tokens = auth_service.create_tokens(user["id"], user["username"])
        logger.info(f"Token refreshed for user {user['username']}")
        
        return TokenResponse(**tokens)
    
    @router.get("/me")
    async def get_current_user_info(credentials: HTTPAuthorizationCredentials = Depends(security)):
        """Get current user information"""
        payload = auth_service.decode_token(credentials.credentials)
        
        if not payload or payload.get("type") != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token"
            )
        
        user = await db.admin_users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return user
    
    return router
