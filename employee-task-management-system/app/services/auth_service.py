"""Auth service: registration + login business rules.

Router = HTTP layer. Service = rules (duplicates, password checks, tokens).
"""
from sqlalchemy.orm import Session

from app.models.enums import UserRole
from app.repositories import user_repository
from app.schemas.user import UserRegister
from app.utils import security
from app.utils.exceptions import BadRequestError, ConflictError, UnauthorizedError


def register(db: Session, data: UserRegister):
    """Create a user; reject duplicate username/email (409 Conflict)."""
    if user_repository.get_by_username(db, data.username):
        raise ConflictError("Username already exists")
    if user_repository.get_by_email(db, data.email):
        raise ConflictError("Email already exists")
    # Only allow ADMIN creation openly in this demo; real prod would restrict this.
    # Keep simple: allow requested role (documented in README as demo simplification).
    return user_repository.create(
        db,
        username=data.username,
        email=data.email,
        password_hash=security.hash_password(data.password),
        role=data.role,
    )


def authenticate(db: Session, username: str, password: str):
    """Verify credentials; return user or raise 401 (never reveal which field failed)."""
    user = user_repository.get_by_username(db, username)
    if user is None or not security.verify_password(password, user.password_hash):
        raise UnauthorizedError("Invalid username or password")
    if not user.is_active:
        raise UnauthorizedError("User account is inactive")
    return user


def create_token_for_user(user) -> str:
    return security.create_access_token(subject=str(user.id))
