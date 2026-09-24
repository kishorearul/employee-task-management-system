"""Auth dependencies: current user + role-based access control (RBAC).

Used in routers like: `current: User = Depends(require_roles(UserRole.ADMIN))`.
Permissions are enforced in the BACKEND, never just in the frontend.
"""
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.repositories import user_repository
from app.utils import security
from app.utils.exceptions import ForbiddenError, UnauthorizedError

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> User:
    """Validate the Bearer JWT and return the logged-in User."""
    if credentials is None or not credentials.credentials:
        raise UnauthorizedError("Not authenticated")
    try:
        user_id = security.decode_access_token(credentials.credentials)
    except Exception:
        raise UnauthorizedError("Invalid or expired token")
    user = user_repository.get_by_id(db, int(user_id))
    if user is None or not user.is_active:
        raise UnauthorizedError("User not found or inactive")
    return user


def require_roles(*allowed: UserRole):
    """Dependency factory: only users with one of `allowed` roles may proceed."""

    def _checker(current: User = Depends(get_current_user)) -> User:
        if current.role not in allowed:
            raise ForbiddenError("You do not have permission to perform this action")
        return current

    return _checker


# Convenience aliases used across routers.
require_admin = require_roles(UserRole.ADMIN)
require_manager_or_admin = require_roles(UserRole.MANAGER, UserRole.ADMIN)
