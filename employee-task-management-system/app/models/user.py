"""User model: login identity + role.

Relationship: one User has at most one Employee profile (user_id unique).
"""
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.config.database import Base
from app.models.enums import UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.EMPLOYEE, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # One-to-one: a login account may be linked to one employee record.
    employee_profile: Mapped["Employee | None"] = relationship(
        "Employee", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    # Projects this user manages (only meaningful when role is MANAGER/ADMIN).
    managed_projects: Mapped[list["Project"]] = relationship("Project", back_populates="manager")
    # Tasks this user created (audit trail of who created what).
    created_tasks: Mapped[list["Task"]] = relationship(
        "Task", back_populates="creator", foreign_keys="Task.created_by"
    )

    def __repr__(self) -> str:  # helpful in logs / debugging
        return f"<User id={self.id} username={self.username!r} role={self.role}>"
