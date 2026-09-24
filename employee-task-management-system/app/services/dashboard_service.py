"""Dashboard service: aggregate counts for the dashboard page + API."""
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.department import Department
from app.models.employee import Employee
from app.models.enums import TaskStatus
from app.models.project import Project
from app.models.task import Task


def get_summary(db: Session) -> dict:
    total_employees = db.query(func.count(Employee.id)).scalar() or 0
    total_departments = db.query(func.count(Department.id)).scalar() or 0
    total_projects = db.query(func.count(Project.id)).scalar() or 0
    total_tasks = db.query(func.count(Task.id)).scalar() or 0
    completed = db.query(func.count(Task.id)).filter(Task.status == TaskStatus.COMPLETED).scalar() or 0
    in_progress = db.query(func.count(Task.id)).filter(Task.status == TaskStatus.IN_PROGRESS).scalar() or 0
    pending = total_tasks - completed - in_progress
    return {
        "total_employees": total_employees,
        "total_departments": total_departments,
        "total_projects": total_projects,
        "total_tasks": total_tasks,
        "completed_tasks": completed,
        "in_progress_tasks": in_progress,
        "pending_tasks": pending,
    }
