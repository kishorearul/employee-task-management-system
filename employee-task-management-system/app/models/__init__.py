"""Import all models here so Alembic autogenerate + Base.metadata see every table."""
from app.models.department import Department  # noqa: F401
from app.models.employee import Employee  # noqa: F401
from app.models.enums import ProjectStatus, TaskPriority, TaskStatus, UserRole  # noqa: F401
from app.models.project import Project  # noqa: F401
from app.models.task import Task  # noqa: F401
from app.models.user import User  # noqa: F401
