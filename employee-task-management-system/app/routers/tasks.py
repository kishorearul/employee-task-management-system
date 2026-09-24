"""Task router.

- MANAGER/ADMIN: full CRUD + assignment.
- EMPLOYEE: list/view + update own task status (enforced in service layer).
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models.enums import TaskPriority, TaskStatus, UserRole
from app.models.user import User
from app.schemas.task import TaskCreate, TaskOut, TaskUpdate
from app.services import task_service
from app.utils.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


@router.get("", response_model=list[TaskOut], summary="List tasks",
            description="Filter by status, priority, project, or assignee.")
def list_tasks(skip: int = 0, limit: int = 100, status: TaskStatus | None = None,
               priority: TaskPriority | None = None, project_id: int | None = None,
               assigned_to: int | None = None, db: Session = Depends(get_db),
               _=Depends(get_current_user)):
    return task_service.list_tasks(db, skip=skip, limit=limit, status=status,
                                   priority=priority, project_id=project_id,
                                   assigned_to=assigned_to)


@router.get("/{task_id}", response_model=TaskOut, summary="Get task by id")
def get_task(task_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return task_service.get_task(db, task_id)


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED,
             summary="Create task", description="MANAGER or ADMIN only. Assignee/project must exist.")
def create_task(data: TaskCreate, db: Session = Depends(get_db),
                current: User = Depends(require_roles(UserRole.MANAGER, UserRole.ADMIN))):
    return task_service.create_task(db, data, creator_id=current.id)


@router.put("/{task_id}", response_model=TaskOut, summary="Update task",
            description="Managers/admins: full edit. Employees: own task status only.")
def update_task(task_id: int, data: TaskUpdate, db: Session = Depends(get_db),
                current: User = Depends(get_current_user)):
    return task_service.update_task(db, task_id, data, current)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete task")
def delete_task(task_id: int, db: Session = Depends(get_db),
                _=Depends(require_roles(UserRole.MANAGER, UserRole.ADMIN))):
    task_service.delete_task(db, task_id)
    return None
