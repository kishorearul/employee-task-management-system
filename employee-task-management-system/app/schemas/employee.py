"""Employee schemas."""
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class EmployeeCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=30)
    designation: str | None = Field(default=None, max_length=100)
    department_id: int | None = None
    user_id: int | None = None
    joining_date: date | None = None


class EmployeeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=100)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=30)
    designation: str | None = Field(default=None, max_length=100)
    department_id: int | None = None
    joining_date: date | None = None


class EmployeeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    phone: str | None = None
    designation: str | None = None
    department_id: int | None = None
    user_id: int | None = None
    joining_date: date | None = None
    created_at: datetime | None = None
