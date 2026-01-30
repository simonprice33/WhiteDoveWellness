from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import Optional, List
from datetime import datetime
import uuid


# Base model with common config
class BaseSchema(BaseModel):
    model_config = ConfigDict(extra="ignore")


# Auth Models
class TokenResponse(BaseSchema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenRefresh(BaseSchema):
    refresh_token: str


class LoginRequest(BaseSchema):
    username: str
    password: str


# Admin User Models
class AdminUserBase(BaseSchema):
    username: str
    email: EmailStr
    is_active: bool = True


class AdminUserCreate(BaseSchema):
    username: str
    email: EmailStr
    password: str


class AdminUserUpdate(BaseSchema):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


class AdminUser(AdminUserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Therapy Models
class TherapyBase(BaseSchema):
    name: str
    short_description: str
    full_description: Optional[str] = None
    image_url: Optional[str] = None
    icon: Optional[str] = None
    display_order: int = 0
    is_active: bool = True


class TherapyCreate(TherapyBase):
    pass


class TherapyUpdate(BaseSchema):
    name: Optional[str] = None
    short_description: Optional[str] = None
    full_description: Optional[str] = None
    image_url: Optional[str] = None
    icon: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class Therapy(TherapyBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Price Models
class PriceBase(BaseSchema):
    therapy_id: str
    name: str
    duration: str
    price: float
    description: Optional[str] = None
    display_order: int = 0
    is_active: bool = True


class PriceCreate(PriceBase):
    pass


class PriceUpdate(BaseSchema):
    therapy_id: Optional[str] = None
    name: Optional[str] = None
    duration: Optional[str] = None
    price: Optional[float] = None
    description: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class Price(PriceBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Contact Models
class ContactSubmissionBase(BaseSchema):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str


class ContactSubmissionCreate(ContactSubmissionBase):
    pass


class ContactSubmission(ContactSubmissionBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    is_read: bool = False
    notes: Optional[str] = None


# Affiliation Models
class AffiliationBase(BaseSchema):
    name: str
    logo_url: str
    website_url: Optional[str] = None
    display_order: int = 0
    is_active: bool = True


class AffiliationCreate(AffiliationBase):
    pass


class AffiliationUpdate(BaseSchema):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class Affiliation(AffiliationBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Policy Models
class PolicyBase(BaseSchema):
    title: str
    slug: str
    content: str
    display_order: int = 0
    is_active: bool = True


class PolicyCreate(PolicyBase):
    pass


class PolicyUpdate(BaseSchema):
    title: Optional[str] = None
    slug: Optional[str] = None
    content: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class Policy(PolicyBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Settings Models
class SocialLinks(BaseSchema):
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    twitter_url: Optional[str] = None
    linkedin_url: Optional[str] = None


class SiteSettings(BaseSchema):
    id: str = "site_settings"
    business_name: str = "White Dove Wellness"
    tagline: str = "Holistic Therapies"
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    social_links: SocialLinks = Field(default_factory=SocialLinks)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Client Models
class ClientBase(BaseSchema):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[str] = None
    medical_notes: Optional[str] = None


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseSchema):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    date_of_birth: Optional[str] = None
    medical_notes: Optional[str] = None


class Client(ClientBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# Client Note Models
class ClientNoteBase(BaseSchema):
    client_id: str
    note: str
    session_date: Optional[str] = None


class ClientNoteCreate(ClientNoteBase):
    pass


class ClientNoteUpdate(BaseSchema):
    note: Optional[str] = None
    session_date: Optional[str] = None


class ClientNote(ClientNoteBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = None
