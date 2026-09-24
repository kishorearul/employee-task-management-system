"""Task repository (includes filter support)."""
from sqlalchemy.orm import Session

from app.models.task import Task


def list_filtered(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    status=None,
    priority=None,
    project_id: int | None = None,
    assigned_to: int | None = None,
) -> list[Task]:
    query = db.query(Task)
    if status is not None:
        query = query.filter(Task.status == status)
    if priority is not None:
        query = query.filter(Task.priority == priority)
    if project_id is not None:
        query = query.filter(Task.project_id == project_id)
    if assigned_to is not None:
        query = query.filter(Task.assigned_to == assigned_to)
    return query.offset(skip).limit(limit).all()


def get_by_id(db: Session, task_id: int) -> Task | None:
    return db.get(Task, task_id)


def create(db: Session, **fields) -> Task:
    obj = Task(**fields)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def delete(db: Session, obj: Task) -> None:
    db.delete(obj)
    db.commit()
