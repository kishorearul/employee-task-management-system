"""Dashboard router: counts for the frontend dashboard page."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.services import dashboard_service
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary", summary="Get dashboard summary",
            description="Total employees/departments/projects/tasks + task breakdown.")
def summary(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return dashboard_service.get_summary(db)
