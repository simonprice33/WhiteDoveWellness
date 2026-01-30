from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from models.schemas import Client, ClientCreate, ClientUpdate, ClientNote, ClientNoteCreate, ClientNoteUpdate
from services.auth_service import auth_service
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/clients", tags=["Clients"])
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


def create_client_routes(db: AsyncIOMotorDatabase):
    """Create client management routes"""
    
    # Client CRUD
    @router.get("/", response_model=List[Client])
    async def list_clients(
        search: str = None,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """List all clients (admin only)"""
        await verify_admin(credentials, db)
        
        query = {}
        if search:
            query["$or"] = [
                {"first_name": {"$regex": search, "$options": "i"}},
                {"last_name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}}
            ]
        
        clients = await db.clients.find(query, {"_id": 0}).sort("last_name", 1).to_list(500)
        return clients
    
    @router.get("/{client_id}", response_model=Client)
    async def get_client(
        client_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Get a specific client (admin only)"""
        await verify_admin(credentials, db)
        
        client = await db.clients.find_one({"id": client_id}, {"_id": 0})
        if not client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
        return client
    
    @router.post("/", response_model=Client, status_code=status.HTTP_201_CREATED)
    async def create_client(
        client_data: ClientCreate,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Create a new client (admin only)"""
        await verify_admin(credentials, db)
        
        client_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        client_doc = {
            "id": client_id,
            **client_data.model_dump(),
            "created_at": now,
            "updated_at": now
        }
        
        await db.clients.insert_one(client_doc)
        logger.info(f"Created client: {client_data.first_name} {client_data.last_name}")
        
        return await db.clients.find_one({"id": client_id}, {"_id": 0})
    
    @router.put("/{client_id}", response_model=Client)
    async def update_client(
        client_id: str,
        client_data: ClientUpdate,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Update a client (admin only)"""
        await verify_admin(credentials, db)
        
        client = await db.clients.find_one({"id": client_id})
        if not client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
        
        update_data = {k: v for k, v in client_data.model_dump().items() if v is not None}
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        await db.clients.update_one({"id": client_id}, {"$set": update_data})
        
        return await db.clients.find_one({"id": client_id}, {"_id": 0})
    
    @router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_client(
        client_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Delete a client and their notes (admin only)"""
        await verify_admin(credentials, db)
        
        client = await db.clients.find_one({"id": client_id})
        if not client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
        
        # Delete client notes
        await db.client_notes.delete_many({"client_id": client_id})
        await db.clients.delete_one({"id": client_id})
        logger.info(f"Deleted client: {client_id}")
    
    # Client Notes CRUD
    @router.get("/{client_id}/notes", response_model=List[ClientNote])
    async def list_client_notes(
        client_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """List all notes for a client (admin only)"""
        await verify_admin(credentials, db)
        
        client = await db.clients.find_one({"id": client_id})
        if not client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
        
        notes = await db.client_notes.find({"client_id": client_id}, {"_id": 0}).sort("created_at", -1).to_list(500)
        return notes
    
    @router.post("/{client_id}/notes", response_model=ClientNote, status_code=status.HTTP_201_CREATED)
    async def create_client_note(
        client_id: str,
        note_data: ClientNoteCreate,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Create a new client note (admin only)"""
        user = await verify_admin(credentials, db)
        
        client = await db.clients.find_one({"id": client_id})
        if not client:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")
        
        note_id = str(uuid.uuid4())
        note_doc = {
            "id": note_id,
            "client_id": client_id,
            "note": note_data.note,
            "session_date": note_data.session_date,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user["id"]
        }
        
        await db.client_notes.insert_one(note_doc)
        logger.info(f"Created note for client: {client_id}")
        
        return await db.client_notes.find_one({"id": note_id}, {"_id": 0})
    
    @router.put("/{client_id}/notes/{note_id}", response_model=ClientNote)
    async def update_client_note(
        client_id: str,
        note_id: str,
        note_data: ClientNoteUpdate,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Update a client note (admin only)"""
        await verify_admin(credentials, db)
        
        note = await db.client_notes.find_one({"id": note_id, "client_id": client_id})
        if not note:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
        
        update_data = {k: v for k, v in note_data.model_dump().items() if v is not None}
        
        if update_data:
            await db.client_notes.update_one({"id": note_id}, {"$set": update_data})
        
        return await db.client_notes.find_one({"id": note_id}, {"_id": 0})
    
    @router.delete("/{client_id}/notes/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_client_note(
        client_id: str,
        note_id: str,
        credentials: HTTPAuthorizationCredentials = Depends(security)
    ):
        """Delete a client note (admin only)"""
        await verify_admin(credentials, db)
        
        note = await db.client_notes.find_one({"id": note_id, "client_id": client_id})
        if not note:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
        
        await db.client_notes.delete_one({"id": note_id})
        logger.info(f"Deleted note: {note_id}")
    
    return router
