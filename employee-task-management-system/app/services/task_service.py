"""Task service: assignment rules + employee self-update guard.

Key business rules:
- task must belong to an existing project
- assignee must be an existing employee
- completed projects reject new tasks unless reopened
- EMPLOYEE role may only change `status` of their own assigned task
"""
from sqlalchemy.orm import Session

from app.models.enums import ProjectStatus, TaskStatus, UserRole
from app.models.task import Task
from app.models.user import User
from app.repositories import employee_repository, project_repository, task_repository
from app.schemas.task import TaskCreate, TaskUpdate
from app.utils.exceptions import BadRequestError, ForbiddenError, NotFoundError


def list_tasks(db: Session, skip=0, limit=100, status=None, priority=None,
               project_id: int | None = None, assigned_to: int | None = None):
    return task_repository.list_filtered(
        db, skip=skip, limit=limit, status=status, priority=priority,
        project_id=project_id, assigned_to=assigned_to,
    )


def get_task(db: Session, task_id: int) -> Task:
    obj = task_repository.get_by_id(db, task_id)
    if obj is None:
        raise NotFoundError("Task not found")
    return obj


def create_task(db: Session, data: TaskCreate, creator_id: int | None = None) -> Task:
    project = project_repository.get_by_id(db, data.project_id)
    if project is None:
        raise BadRequestError("Project does not exist")
    if project.status == ProjectStatus.COMPLETED:
        raise BadRequestError("Cannot add tasks to a completed project (reopen it first)")
    if data.assigned_to is not None and employee_repository.get_by_id(db, data.assigned_to) is None:
        raise BadRequestError("Assigned employee does not exist")
    fields = data.model_dump()
    fields["created_by"] = creator_id
    return task_repository.create(db, **fields)


def _is_task_owner(db: Session, user: User, task: Task) -> bool:
    """True if the user's linked employee profile is the task assignee."""
    if task.assigned_to is None:
        return False
    emp = employee_repository.get_by_id(db, task.assigned_to)
    return emp is not None and emp.user_id == user.id


def update_task(db: Session, task_id: int, data: TaskUpdate, current: User) -> Task:
    task = get_task(db, task_id)
    patch = data.model_dump(exclude_unset=True)

    # --- EMPLOYEE path: limited self-service ---
    if current.role == UserRole.EMPLOYEE:
        if not _is_task_owner(db, current, task):
            raise ForbiddenError("You can only update your own assigned tasks")
        forbidden = set(patch.keys()) - {"status"}
        if forbidden:
            raise ForbiddenError(f"Employees may only update status, not: {sorted(forbidden)}")
        if "status" in patch:
            task.status = patch["status"]
            db.commit()
            db.refresh(task)
        return task

    # --- MANAGER / ADMIN path: full edit with validation ---
    if "project_id" in patch and patch["project_id"] is not None:
        if project_repository.get_by_id(db, patch["project_id"]) is None:
            raise BadRequestError("Project does not exist")
    if "assigned_to" in patch and patch["assigned_to"] is not None:
        if employee_repository.get_by_id(db, patch["assigned_to"]) is None:
            raise BadRequestError("Assigned employee does not exist")
    for key, value in patch.items():
        setattr(task, key, value)
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task_id: int) -> None:
    obj = get_task(db, task_id)
    task_repository.delete(db, obj)
