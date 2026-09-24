"""Employee router."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models.enums import UserRole
from app.schemas.employee import EmployeeCreate, EmployeeOut, EmployeeUpdate
from app.services import employee_service
from app.utils.dependencies import require_roles

router = APIRouter(prefix="/api/employees", tags=["Employees"])


@router.get("", response_model=list[EmployeeOut], summary="List employees",
            description="Supports pagination + optional department filter.")
def list_employees(skip: int = 0, limit: int = 100, department_id: int | None = None,
                   db: Session = Depends(get_db),
                   _=Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER))):
    return employee_service.list_employees(db, skip=skip, limit=limit, department_id=department_id)


@router.get("/{employee_id}", response_model=EmployeeOut, summary="Get employee by id")
def get_employee(employee_id: int, db: Session = Depends(get_db),
                 _=Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER))):
    return employee_service.get_employee(db, employee_id)


@router.post("", response_model=EmployeeOut, status_code=status.HTTP_201_CREATED,
             summary="Create employee", description="ADMIN only. Email must be unique.")
def create_employee(data: EmployeeCreate, db: Session = Depends(get_db),
                    _=Depends(require_roles(UserRole.ADMIN))):
    return employee_service.create_employee(db, data)


@router.put("/{employee_id}", response_model=EmployeeOut, summary="Update employee")
def update_employee(employee_id: int, data: EmployeeUpdate, db: Session = Depends(get_db),
                     _=Depends(require_roles(UserRole.ADMIN))):
    return employee_service.update_employee(db, employee_id, data)


@router.delete("/{employee_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete employee")
def delete_employee(employee_id: int, db: Session = Depends(get_db),
                    _=Depends(require_roles(UserRole.ADMIN))):
    employee_service.delete_employee(db, employee_id)
    return None
