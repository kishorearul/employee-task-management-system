"""Employee service: email uniqueness + FK validation."""
from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.repositories import department_repository, employee_repository, user_repository
from app.schemas.employee import EmployeeCreate, EmployeeUpdate
from app.utils.exceptions import BadRequestError, ConflictError, NotFoundError


def list_employees(db: Session, skip=0, limit=100, department_id: int | None = None):
    return employee_repository.list_all(db, skip=skip, limit=limit, department_id=department_id)


def get_employee(db: Session, employee_id: int) -> Employee:
    obj = employee_repository.get_by_id(db, employee_id)
    if obj is None:
        raise NotFoundError("Employee not found")
    return obj


def create_employee(db: Session, data: EmployeeCreate) -> Employee:
    if employee_repository.get_by_email(db, data.email):
        raise ConflictError("Employee email already exists")
    if data.department_id is not None and department_repository.get_by_id(db, data.department_id) is None:
        raise BadRequestError("Department does not exist")
    if data.user_id is not None:
        if user_repository.get_by_id(db, data.user_id) is None:
            raise BadRequestError("User does not exist")
        if employee_repository.get_by_user_id(db, data.user_id) is not None:
            raise ConflictError("User already linked to an employee")
    return employee_repository.create(db, **data.model_dump())


def update_employee(db: Session, employee_id: int, data: EmployeeUpdate) -> Employee:
    obj = get_employee(db, employee_id)
    patch = data.model_dump(exclude_unset=True)
    if "email" in patch and patch["email"] != obj.email:
        if employee_repository.get_by_email(db, patch["email"]):
            raise ConflictError("Employee email already exists")
    if "department_id" in patch and patch["department_id"] is not None:
        if department_repository.get_by_id(db, patch["department_id"]) is None:
            raise BadRequestError("Department does not exist")
    for key, value in patch.items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


def delete_employee(db: Session, employee_id: int) -> None:
    obj = get_employee(db, employee_id)
    employee_repository.delete(db, obj)
