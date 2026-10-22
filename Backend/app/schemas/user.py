from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


# Base user schema
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = Field(default=None, max_length=255)
    phone_number: Optional[str] = Field(default=None, max_length=50)
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    email_on_scan: bool = False
    email_on_message: bool = True


# Schema for creating a new user (Registration)
class UserCreate(BaseModel):
    redirect_path: Optional[str] = Field(default=None, max_length=512)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128, description="En az 6 karakter")
    full_name: Optional[str] = Field(default=None, max_length=255)
    phone_number: Optional[str] = Field(default=None, max_length=50)


# Schema for login request
class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=128)


# Schema for updating user profile
class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, max_length=255)
    phone_number: Optional[str] = Field(default=None, max_length=50)
    avatar_url: Optional[str] = Field(default=None, max_length=500)
    email_on_scan: Optional[bool] = None
    email_on_message: Optional[bool] = None


# Schema for changing password
class UserPasswordChange(BaseModel):
    current_password: str = Field(..., max_length=128)
    new_password: str = Field(..., min_length=6, max_length=128)


# Schema for requesting password reset
class UserForgotPassword(BaseModel):
    redirect_path: Optional[str] = Field(default=None, max_length=512)
    email: EmailStr


# Schema for completing password reset
class UserResetPassword(BaseModel):
    token: str = Field(..., max_length=2048)
    new_password: str = Field(..., min_length=6, max_length=128)



# User response schema
class UserResponse(UserBase):
    id: str
    is_active: bool
    is_superuser: bool
    email_verified: bool
    has_password: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Auth token response
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    exp: Optional[int] = None


class RegistrationResponse(BaseModel):
    message: str
    email: EmailStr
    verification_required: bool = True


class EmailTokenRequest(BaseModel):
    token: str = Field(..., min_length=1, max_length=4096)
