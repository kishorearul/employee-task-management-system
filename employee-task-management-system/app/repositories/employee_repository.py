"""Employee repository."""
from sqlalchemy.orm import Session

from app.models.employee import Employee


def list_all(
    db: Session, skip: int = 0, limit: int = 100, department_id: int | None = None
) -> list[Employee]:
    query = db.query(Employee)
    if department_id is not None:
        query = query.filter(Employee.department_id == department_id)
    return query.offset(skip).limit(limit).all()


def get_by_id(db: Session, employee_id: int) -> Employee | None:
    return db.get(Employee, employee_id)


def get_by_email(db: Session, email: str) -> Employee | None:
    return db.query(Employee).filter(Employee.email == email).first()


def get_by_user_id(db: Session, user_id: int) -> Employee | None:
    return db.query(Employee).filter(Employee.user_id == user_id).first()


def create(db: Session, **fields) -> Employee:
    obj = Employee(**fields)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def delete(db: Session, obj: Employee) -> None:
    db.delete(obj)
    db.commit()
