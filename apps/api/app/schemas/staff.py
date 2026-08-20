import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

StaffRole = Literal["admin", "moderator"]


class StaffLogin(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=12, max_length=256)


class StaffAccountCreate(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    display_name: str = Field(min_length=2, max_length=128)
    role: Literal["moderator"] = "moderator"
    temporary_password: str = Field(min_length=14, max_length=256)


class StaffPasswordChange(BaseModel):
    current_password: str = Field(min_length=12, max_length=256)
    new_password: str = Field(min_length=14, max_length=256)


class StaffAccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    display_name: str
    role: StaffRole
    is_active: bool
    must_change_password: bool
    created_at: datetime


class StaffSessionOut(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_at: datetime
    staff: StaffAccountOut
