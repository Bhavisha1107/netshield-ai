from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional

ALLOWED_SIGNUP_ROLES = {"admin", "analyst"}


class UserSignup(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "analyst"  # "admin" or "analyst" — chosen at registration

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ALLOWED_SIGNUP_ROLES:
            raise ValueError(f"role must be one of {ALLOWED_SIGNUP_ROLES}")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RoleUpdate(BaseModel):
    role: str  # admin | analyst | viewer


class AuditLogOut(BaseModel):
    id: int
    user_id: Optional[int]
    user_email: Optional[str] = None
    action: str
    details: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True
