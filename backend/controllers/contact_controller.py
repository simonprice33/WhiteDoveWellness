from fastapi import APIRouter, HTTPException, Depends, status, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models.schemas import ContactSubmission, ContactSubmissionCreate
from services.auth_service import auth_service
from services.email_service import email_service
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/contact", tags=["Contact"])
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


def create_contact_routes(db: AsyncIOMotorDatabase):
    """Create contact form routes"""
    
    @router.post("/", response_model=ContactSubmission, status_code=status.HTTP_201_CREATED)
    async def submit_contact(
        contact_data: ContactSubmissionCreate,
        background_tasks: BackgroundTasks
    ):
        """Submit a contact form (public endpoint)"""
        contact_id = str(uuid.uuid4())
        contact_doc = {
            "id": contact_id,
            **contact_data.model_dump(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_read": False,
            "notes": None
        }
        
        await db.contact_submissions.insert_one(contact_doc)
        logger.info(f"New contact submission from: {contact_data.email}")
        
        # Send email notification in background
        background_tasks.add_task(
            email_service.send_contact_notification,
            contact_data.name,
            contact_data.email,
            contact_data.phone or "",
            contact_data.message
        )
        
        return await db.contact_submissions.find_one({"id": contact_id}, {"_id": 0})
    
    @router.get("/", response_model=List[ContactSubmission])
    async def list_contacts(
        unread_only: bool = False,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """List all contact submissions (admin only)"""
        await verify_admin(credentials, db)
        
        query = {"is_read": False} if unread_only else {}
        contacts = await db.contact_submissions.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
        return contacts
    
    @router.get("/{contact_id}", response_model=ContactSubmission)
    async def get_contact(
        contact_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Get a specific contact submission (admin only)"""
        await verify_admin(credentials, db)
        
        contact = await db.contact_submissions.find_one({"id": contact_id}, {"_id": 0})
        if not contact:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
        return contact
    
    @router.put("/{contact_id}/read")
    async def mark_as_read(
        contact_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Mark contact as read (admin only)"""
        await verify_admin(credentials, db)
        
        contact = await db.contact_submissions.find_one({"id": contact_id})
        if not contact:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
        
        await db.contact_submissions.update_one({"id": contact_id}, {"$set": {"is_read": True}})
        return {"message": "Marked as read"}
    
    @router.put("/{contact_id}/notes")
    async def update_notes(
        contact_id: str,
        notes: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Update contact notes (admin only)"""
        await verify_admin(credentials, db)
        
        contact = await db.contact_submissions.find_one({"id": contact_id})
        if not contact:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
        
        await db.contact_submissions.update_one({"id": contact_id}, {"$set": {"notes": notes}})
        return await db.contact_submissions.find_one({"id": contact_id}, {"_id": 0})
    
    @router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_contact(
        contact_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Delete a contact submission (admin only)"""
        await verify_admin(credentials, db)
        
        contact = await db.contact_submissions.find_one({"id": contact_id})
        if not contact:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found")
        
        await db.contact_submissions.delete_one({"id": contact_id})
        logger.info(f"Deleted contact: {contact_id}")
    
    return router
