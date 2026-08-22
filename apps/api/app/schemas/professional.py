import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ProfessionalPlan = Literal["professional", "organization"]
ProfessionalAccessPlan = Literal["none", "professional", "organization"]
ProfessionalBillingStatus = Literal[
    "not_started",
    "payment_pending",
    "paid",
    "past_due",
    "cancelled",
    "complimentary",
]
ProfessionalStatus = Literal[
    "pending_verification", "pending_review", "active", "suspended", "rejected"
]


class ProfessionalRegistrationStatus(BaseModel):
    registration_enabled: bool
    email_verification_available: bool


class ProfessionalAccountCreate(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    display_name: str = Field(min_length=2, max_length=128)
    organization_name: str = Field(min_length=2, max_length=200)
    password: str = Field(min_length=14, max_length=256)
    requested_plan: ProfessionalPlan
    accept_terms: Literal[True]


class ProfessionalRegistrationAccepted(BaseModel):
    message: str = "If registration was accepted, a verification email has been sent."


class ProfessionalEmailVerificationIn(BaseModel):
    token: str = Field(min_length=32, max_length=256)


class ProfessionalLogin(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=12, max_length=256)


class ProfessionalAccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    display_name: str
    organization_name: str
    requested_plan: ProfessionalPlan
    access_plan: ProfessionalAccessPlan
    billing_status: ProfessionalBillingStatus
    status: ProfessionalStatus
    email_verified_at: datetime | None
    created_at: datetime


class ProfessionalSessionOut(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_at: datetime
    account: ProfessionalAccountOut


class ProfessionalAccountAdminUpdate(BaseModel):
    status: Literal["pending_review", "active", "suspended", "rejected"]
    access_plan: ProfessionalAccessPlan
    billing_status: ProfessionalBillingStatus
    reason: str = Field(min_length=10, max_length=1000)


class ProfessionalAccountAuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    professional_account_id: uuid.UUID
    staff_account_id: uuid.UUID | None
    action: str
    reason: str
    previous_state: dict[str, object] | None
    new_state: dict[str, object] | None
