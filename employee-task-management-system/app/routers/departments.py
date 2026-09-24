"""Department router."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models.enums import UserRole
from app.schemas.department import DepartmentCreate, DepartmentOut, DepartmentUpdate
from app.services import department_service
from app.utils.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/api/departments", tags=["Departments"])


@router.get("", response_model=list[DepartmentOut], summary="List departments")
def list_departments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db),
                     _=Depends(get_current_user)):
    return department_service.list_departments(db, skip=skip, limit=limit)


@router.get("/{department_id}", response_model=DepartmentOut, summary="Get department by id")
def get_department(department_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return department_service.get_department(db, department_id)


@router.post("", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED,
             summary="Create department", description="ADMIN only. Names must be unique.")
def create_department(data: DepartmentCreate, db: Session = Depends(get_db),
                      _=Depends(require_roles(UserRole.ADMIN))):
    return department_service.create_department(db, data)


@router.put("/{department_id}", response_model=DepartmentOut, summary="Update department")
def update_department(department_id: int, data: DepartmentUpdate, db: Session = Depends(get_db),
                      _=Depends(require_roles(UserRole.ADMIN))):
    return department_service.update_department(db, department_id, data)


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete department")
def delete_department(department_id: int, db: Session = Depends(get_db),
                      _=Depends(require_roles(UserRole.ADMIN))):
    department_service.delete_department(db, department_id)
    return None
