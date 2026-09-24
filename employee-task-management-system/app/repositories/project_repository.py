"""Project repository."""
from sqlalchemy.orm import Session

from app.models.project import Project


def list_all(db: Session, skip: int = 0, limit: int = 100) -> list[Project]:
    return db.query(Project).offset(skip).limit(limit).all()


def get_by_id(db: Session, project_id: int) -> Project | None:
    return db.get(Project, project_id)


def create(db: Session, **fields) -> Project:
    obj = Project(**fields)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def delete(db: Session, obj: Project) -> None:
    db.delete(obj)
    db.commit()
