"""Department repository."""
from sqlalchemy.orm import Session

from app.models.department import Department


def list_all(db: Session, skip: int = 0, limit: int = 100) -> list[Department]:
    return db.query(Department).offset(skip).limit(limit).all()


def get_by_id(db: Session, department_id: int) -> Department | None:
    return db.get(Department, department_id)


def get_by_name(db: Session, name: str) -> Department | None:
    return db.query(Department).filter(Department.name == name).first()


def create(db: Session, *, name: str, description: str | None) -> Department:
    obj = Department(name=name, description=description)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def delete(db: Session, obj: Department) -> None:
    db.delete(obj)
    db.commit()
