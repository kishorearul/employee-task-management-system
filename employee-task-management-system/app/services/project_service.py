"""Project service: date rules, manager checks, progress calculation."""
from sqlalchemy.orm import Session

from app.models.enums import ProjectStatus, TaskStatus
from app.models.project import Project
from app.repositories import project_repository, user_repository
from app.schemas.project import ProjectCreate, ProjectProgressOut, ProjectUpdate
from app.utils.exceptions import BadRequestError, NotFoundError


def list_projects(db: Session, skip=0, limit=100):
    return project_repository.list_all(db, skip=skip, limit=limit)


def get_project(db: Session, project_id: int) -> Project:
    obj = project_repository.get_by_id(db, project_id)
    if obj is None:
        raise NotFoundError("Project not found")
    return obj


def create_project(db: Session, data: ProjectCreate) -> Project:
    # Pydantic already checked deadline >= start_date; re-check manager FK here.
    if data.manager_id is not None and user_repository.get_by_id(db, data.manager_id) is None:
        raise BadRequestError("Manager (user) does not exist")
    return project_repository.create(db, **data.model_dump())


def update_project(db: Session, project_id: int, data: ProjectUpdate) -> Project:
    obj = get_project(db, project_id)
    patch = data.model_dump(exclude_unset=True)
    if "manager_id" in patch and patch["manager_id"] is not None:
        if user_repository.get_by_id(db, patch["manager_id"]) is None:
            raise BadRequestError("Manager (user) does not exist")
    # Validate resulting date combination.
    start = patch.get("start_date", obj.start_date)
    deadline = patch.get("deadline", obj.deadline)
    if start and deadline and deadline < start:
        raise BadRequestError("deadline must not be earlier than start_date")
    for key, value in patch.items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_project(db: Session, project_id: int) -> None:
    obj = get_project(db, project_id)
    project_repository.delete(db, obj)


def get_progress(db: Session, project_id: int) -> ProjectProgressOut:
    """Calculate progress from live task data (never store a cached percentage)."""
    project = get_project(db, project_id)
    tasks = list(project.tasks)  # lazy-loaded relationship
    total = len(tasks)
    completed = sum(1 for t in tasks if t.status == TaskStatus.COMPLETED)
    in_progress = sum(1 for t in tasks if t.status == TaskStatus.IN_PROGRESS)
    pending = total - completed - in_progress
    percentage = round((completed / total * 100) if total else 0.0, 2)
    return ProjectProgressOut(
        project_id=project.id,
        total_tasks=total,
        completed_tasks=completed,
        in_progress_tasks=in_progress,
        pending_tasks=pending,
        completion_percentage=percentage,
    )
