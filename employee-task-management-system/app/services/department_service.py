"""Department service: duplicate-name guard + CRUD rules."""
from sqlalchemy.orm import Session

from app.models.department import Department
from app.repositories import department_repository
from app.schemas.department import DepartmentCreate, DepartmentUpdate
from app.utils.exceptions import ConflictError, NotFoundError


def list_departments(db: Session, skip: int = 0, limit: int = 100):
    return department_repository.list_all(db, skip=skip, limit=limit)


def get_department(db: Session, department_id: int) -> Department:
    obj = department_repository.get_by_id(db, department_id)
    if obj is None:
        raise NotFoundError("Department not found")
    return obj


def create_department(db: Session, data: DepartmentCreate) -> Department:
    if department_repository.get_by_name(db, data.name):
        raise ConflictError("Department name already exists")
    return department_repository.create(db, name=data.name, description=data.description)


def update_department(db: Session, department_id: int, data: DepartmentUpdate) -> Department:
    obj = get_department(db, department_id)
    if data.name and data.name != obj.name and department_repository.get_by_name(db, data.name):
        raise ConflictError("Department name already exists")
    if data.name is not None:
        obj.name = data.name
    if data.description is not None:
        obj.description = data.description
    db.commit()
    db.refresh(obj)
    return obj


def delete_department(db: Session, department_id: int) -> None:
    obj = get_department(db, department_id)
    department_repository.delete(db, obj)
