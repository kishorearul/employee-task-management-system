"""Auth router: register / login / me.

Flow: client POSTs credentials -> service validates -> returns JWT ->
client sends `Authorization: Bearer <token>` on later requests.
"""
from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.config.database import get_db
from app.schemas.user import TokenOut, UserLogin, UserOut, UserRegister
from app.services import auth_service
from app.utils.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED,
             summary="Register a new user", description="Create a login account. Rejects duplicate username/email.")
def register(data: UserRegister, db: Session = Depends(get_db)):
    return auth_service.register(db, data)


@router.post("/login", response_model=TokenOut,
             summary="Login and get JWT", description="OAuth2 password flow. Returns a Bearer access token.")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = auth_service.authenticate(db, form.username, form.password)
    return TokenOut(access_token=auth_service.create_token_for_user(user))


@router.post("/token", response_model=TokenOut, include_in_schema=False)
def token_alias(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Alias so Swagger's Authorize button works with /api/auth/token."""
    return login(form, db)


@router.get("/me", response_model=UserOut,
            summary="Get current user", description="Return the user behind the Bearer token.")
def me(current=Depends(get_current_user)):
    return current
