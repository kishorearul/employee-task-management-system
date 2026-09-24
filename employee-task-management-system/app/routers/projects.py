"""Project router (+ progress endpoint)."""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.models.enums import UserRole
from app.schemas.project import ProjectCreate, ProjectOut, ProjectProgressOut, ProjectUpdate
from app.services import project_service
from app.utils.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/api/projects", tags=["Projects"])


@router.get("", response_model=list[ProjectOut], summary="List projects")
def list_projects(skip: int = 0, limit: int = 100, db: Session = Depends(get_db),
                  _=Depends(get_current_user)):
    return project_service.list_projects(db, skip=skip, limit=limit)


@router.get("/{project_id}", response_model=ProjectOut, summary="Get project by id")
def get_project(project_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return project_service.get_project(db, project_id)


@router.get("/{project_id}/progress", response_model=ProjectProgressOut,
            summary="Get project progress",
            description="Computes total/completed/in-progress/pending + completion % from live tasks.")
def get_progress(project_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return project_service.get_progress(db, project_id)


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED,
             summary="Create project", description="MANAGER or ADMIN only.")
def create_project(data: ProjectCreate, db: Session = Depends(get_db),
                   _=Depends(require_roles(UserRole.MANAGER, UserRole.ADMIN))):
    return project_service.create_project(db, data)


@router.put("/{project_id}", response_model=ProjectOut, summary="Update project")
def update_project(project_id: int, data: ProjectUpdate, db: Session = Depends(get_db),
                   _=Depends(require_roles(UserRole.MANAGER, UserRole.ADMIN))):
    return project_service.update_project(db, project_id, data)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete project")
def delete_project(project_id: int, db: Session = Depends(get_db),
                   _=Depends(require_roles(UserRole.MANAGER, UserRole.ADMIN))):
    project_service.delete_project(db, project_id)
    return None
