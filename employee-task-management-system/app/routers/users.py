"""User admin router: ADMIN can list users (user management)."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import UserOut
from app.utils.dependencies import require_roles

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("", response_model=list[UserOut], summary="List users (ADMIN only)")
def list_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db),
               _=Depends(require_roles(UserRole.ADMIN))):
    return db.query(User).offset(skip).limit(limit).all()
