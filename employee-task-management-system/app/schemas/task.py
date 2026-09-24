"""Task schemas."""
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import TaskPriority, TaskStatus


class TaskCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    description: str | None = None
    project_id: int
    assigned_to: int | None = None
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.TODO
    deadline: date | None = None


class TaskUpdate(BaseModel):
    """All fields optional; services enforce who may change what."""

    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = None
    project_id: int | None = None
    assigned_to: int | None = None
    priority: TaskPriority | None = None
    status: TaskStatus | None = None
    deadline: date | None = None


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None = None
    project_id: int
    assigned_to: int | None = None
    created_by: int | None = None
    priority: TaskPriority
    status: TaskStatus
    deadline: date | None = None
    created_at: datetime | None = None
