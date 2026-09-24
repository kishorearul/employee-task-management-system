"""FastAPI application entrypoint.

Request flow: Client -> Router -> Service -> Repository -> SQLAlchemy -> PostgreSQL.
Routers stay thin; business logic lives in services.
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.config.settings import settings
from app.routers import auth, dashboard, departments, employees, projects, tasks, users
from app.utils.exceptions import register_exception_handlers

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION,
              description="Enterprise Employee Task & Project Management API with JWT + RBAC.")

register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # demo portfolio app; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(departments.router)
app.include_router(employees.router)
app.include_router(projects.router)
app.include_router(tasks.router)
app.include_router(dashboard.router)


@app.get("/", include_in_schema=False, summary="Web UI landing page")
def root():
    # Browsers opening the base URL get the clickable web app;
    # API clients use /api (JSON) and /health (probe) below.
    return RedirectResponse(url="/frontend/")


@app.get("/api", tags=["Health"], summary="API info")
def api_info():
    return {"message": f"{settings.APP_NAME} API is running", "version": settings.APP_VERSION}


@app.get("/health", tags=["Health"], summary="Health probe")
def health():
    return {"status": "ok"}


# Serve the vanilla-JS frontend (frontend/ folder) if present.
try:
    app.mount("/frontend", StaticFiles(directory="frontend", html=True), name="frontend")
except Exception as exc:  # directory missing in some test contexts
    logger.warning("Frontend static mount skipped: %s", exc)
