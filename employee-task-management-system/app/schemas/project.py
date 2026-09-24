"""Project schemas."""
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.enums import ProjectStatus


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    description: str | None = None
    manager_id: int | None = None
    start_date: date | None = None
    deadline: date | None = None
    status: ProjectStatus = ProjectStatus.PLANNED

    @model_validator(mode="after")
    def _check_dates(self):
        # Business rule: deadline must not be earlier than start date.
        if self.start_date and self.deadline and self.deadline < self.start_date:
            raise ValueError("deadline must not be earlier than start_date")
        return self


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    description: str | None = None
    manager_id: int | None = None
    start_date: date | None = None
    deadline: date | None = None
    status: ProjectStatus | None = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    manager_id: int | None = None
    start_date: date | None = None
    deadline: date | None = None
    status: ProjectStatus
    created_at: datetime | None = None


class ProjectProgressOut(BaseModel):
    project_id: int
    total_tasks: int
    completed_tasks: int
    in_progress_tasks: int
    pending_tasks: int
    completion_percentage: float
