<div align="center">

# ETMS — Employee Task & Project Management System

**People. Projects. Progress.**

An enterprise-style internal operations platform for managing employees, departments,
projects and tasks — with JWT authentication and role-based access control.

[![Python 3.12+](https://img.shields.io/badge/python-3.12%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![SQLAlchemy 2.x](https://img.shields.io/badge/SQLAlchemy-2.x-D71F00?style=flat-square)](https://www.sqlalchemy.org/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![pytest](https://img.shields.io/badge/tests-20%20passing-2c8a4e?style=flat-square&logo=pytest&logoColor=white)](#-testing)

[Features](#-features) · [Screenshots](#-screenshots) · [Quickstart](#-quickstart) · [API Reference](#-api-reference) · [Architecture](#-architecture)

![ETMS dashboard](docs/screenshots/dashboard.png)

</div>

---

## 📖 Table of Contents

- [About](#-about)
- [Features](#-features)
- [Screenshots](#-screenshots)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Roles & Permissions](#-roles--permissions)
- [Quickstart](#-quickstart)
- [Configuration](#-configuration)
- [API Reference](#-api-reference)
- [Testing](#-testing)
- [Database Migrations](#-database-migrations)
- [Project Structure](#-project-structure)
- [Frontend](#-frontend)
- [Roadmap](#-roadmap)
- [Interview Kit](#-interview-kit)

---

## 📌 About

ETMS is a portfolio-grade backend project that models how a real company tracks work:
**departments** group **employees**, **managers** own **projects**, and **projects** break down
into **tasks** assigned to people. Everything is served through a versioned REST API with
token auth, and enforced per-role on the server — never just hidden in the UI.

Built to be **explained in a technical interview**: clean layered architecture, readable
code over clever code, and every business rule covered by tests.

---

## ✨ Features

| Area | What you get |
|------|--------------|
| 🔐 **Auth** | Registration, OAuth2-password login, JWT access tokens with expiry, `/me` profile |
| 🛡️ **RBAC** | `ADMIN` / `MANAGER` / `EMPLOYEE` enforced by reusable FastAPI dependencies |
| 👥 **Employees** | Full CRUD, department filter, search, pagination, assigned-task view |
| 🏢 **Departments** | Full CRUD, unique names, live staff headcounts |
| 📁 **Projects** | Full CRUD, manager assignment, date validation, detail page with progress bar |
| ✅ **Tasks** | Full CRUD, assignment, priority/status/deadline, 4-dimensional filtering |
| 📊 **Progress** | Per-project totals + completion % computed live from tasks (never stored) |
| 📈 **Dashboard** | KPIs, project overview, task distribution, profile — all from live data |
| 🧱 **Quality** | Centralized errors (`400/401/403/404/409/422/500`), structured logging, 20 pytest tests |
| 🐳 **DevOps** | Dockerfile + Compose (API + PostgreSQL), Alembic migrations, Swagger/ReDoc |

---

## 📸 Screenshots

| Dashboard | Tasks |
|-----------|-------|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Tasks](docs/screenshots/tasks.png) |

| Projects | Project detail |
|----------|---------------|
| ![Projects](docs/screenshots/projects.png) | ![Project detail](docs/screenshots/project-detail.png) |

| Employees | Sign in |
|-----------|---------|
| ![Employees](docs/screenshots/employees.png) | ![Sign in](docs/screenshots/login.png) |

> Screenshots taken from the included enterprise-style UI (`frontend/`) running against the local API.

---

## 🧰 Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Language | **Python 3.12+** | Type hints, modern stdlib, huge ecosystem |
| API | **FastAPI + Uvicorn** | Auto OpenAPI docs, Pydantic validation, dependency injection |
| Database | **PostgreSQL** (SQLite fallback for local dev/tests) | ACID + FK enforcement in prod, zero-setup locally |
| ORM | **SQLAlchemy 2.x** (`mapped_column` style) | Type-safe models, relationship loading, Alembic support |
| Validation | **Pydantic 2.x + pydantic-settings** | Request/response schemas + env-based config |
| Auth | **PyJWT + pwdlib/bcrypt** | Maintained equivalents of `python-jose`/`passlib` (both unmaintained) |
| Migrations | **Alembic** | Versioned schema changes; no `create_all()` in production paths |
| Tests | **pytest + FastAPI TestClient** | 20 tests incl. RBAC and business-rule cases |
| Frontend | **HTML/CSS/vanilla JS** | Zero-build UI consuming the REST API |
| Deploy | **Docker + Docker Compose** | One command: API + PostgreSQL |

---

## 🏛️ Architecture

Layered request flow — routers stay thin, rules live in services:

```
                    ┌──────────────────┐
                    │  Browser / Client │
                    │   (vanilla JS)    │
                    └────────┬─────────┘
                             │  REST + JWT  (Authorization: Bearer <token>)
                    ┌────────▼─────────┐
                    │  FastAPI Routers  │  app/routers/    — thin HTTP layer
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Service Layer    │  app/services/   — business rules
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  Repositories     │  app/repositories/ — DB access only
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  SQLAlchemy ORM   │  app/models/     — relationships, constraints
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │    PostgreSQL     │  (SQLite fallback for local dev/tests)
                    └──────────────────┘
```

Pydantic schemas (`app/schemas/`) validate every request/response at the API boundary.
Auth helpers (`app/utils/security.py`, `app/utils/dependencies.py`) are reusable
FastAPI dependencies. Errors funnel through centralized handlers (`app/utils/exceptions.py`)
so clients always get clean JSON — never tracebacks.

**Database relationships:** one `User` → at most one `Employee` profile (`user_id` unique);
one `Department` → many `Employees`; one `User` (manager) → many `Projects`;
one `Project` → many `Tasks` (cascade delete); one `Employee` → many assigned `Tasks`;
one `User` → many created `Tasks` (audit trail). Unique constraints on usernames, emails,
and department names.

---

## 🔑 Roles & Permissions

| Capability | ADMIN | MANAGER | EMPLOYEE |
|------------|:-----:|:-------:|:--------:|
| Manage users / employees / departments | ✅ | — | — |
| Create & manage projects | ✅ | ✅ | — |
| Create, assign & delete tasks | ✅ | ✅ | — |
| View directory, projects & progress | ✅ | ✅ | ✅ |
| Update **own** assigned task status | ✅ | ✅ | ✅ |
| Edit other fields / others' tasks | ✅ | ✅ | ⛔ 403 |

> Permissions are enforced in `task_service` / route dependencies and covered by tests —
> the UI only mirrors them for usability.

---

## 🚀 Quickstart

**Prerequisites:** Python 3.12+, and Docker (only for the Postgres option).

### Option A — Local, no Docker (SQLite, 2 minutes)

```bash
git clone <your-repo-url>
cd employee-task-management-system
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # then set a real SECRET_KEY (see below)
alembic upgrade head
uvicorn app.main:app --reload
```

Open the app → **http://localhost:8000** · API docs → **http://localhost:8000/docs**

Then create your first account: **Sign in page → Register tab** → role `ADMIN`.

### Option B — Docker (PostgreSQL)

```bash
docker compose up --build     # API + PostgreSQL
# http://localhost:8000/docs
docker compose down
```

Generate a secret key with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## ⚙️ Configuration

All settings come from environment variables (never hardcoded) — see [`.env.example`](.env.example):

| Variable | Example | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | `sqlite:///./employee.db` (dev) · `postgresql+psycopg2://postgres:postgres@db:5432/employee_db` (docker) | DB connection |
| `SECRET_KEY` | random 32+ char string | JWT signing key |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | Token lifetime |

---

## 📚 API Reference

Interactive docs with try-it-out auth: **`/docs`** (Swagger) and **`/redoc`**.

<details>
<summary><strong>🔐 Authentication</strong></summary>

| Method & Path | Auth | Notes |
|---------------|------|-------|
| `POST /api/auth/register` | — | `201`; `409` on duplicate username/email |
| `POST /api/auth/login` | — | OAuth2 form fields; returns Bearer JWT |
| `GET /api/auth/me` | JWT | Current user |

</details>

<details>
<summary><strong>👥 Employees</strong> — ADMIN/MANAGER list · ADMIN mutate</summary>

| Method & Path | Notes |
|---------------|-------|
| `GET /api/employees?department_id=&skip=&limit=` | Pagination + department filter |
| `GET /api/employees/{id}` | Detail |
| `POST /api/employees` | Validates department/user FKs, unique email |
| `PUT / DELETE /api/employees/{id}` | Update / remove |

</details>

<details>
<summary><strong>🏢 Departments</strong> — any signed-in user reads · ADMIN mutates</summary>

| Method & Path | Notes |
|---------------|-------|
| `GET /api/departments` · `GET /api/departments/{id}` | List / detail |
| `POST /api/departments` | Unique names enforced (`409`) |
| `PUT / DELETE /api/departments/{id}` | Update / remove |

</details>

<details>
<summary><strong>📁 Projects</strong> — MANAGER/ADMIN mutate</summary>

| Method & Path | Notes |
|---------------|-------|
| `GET /api/projects` · `GET /api/projects/{id}` | List / detail |
| `POST /api/projects` | Rejects `deadline < start_date` (`422`) |
| `PUT / DELETE /api/projects/{id}` | Update / remove (tasks cascade) |
| `GET /api/projects/{id}/progress` | `{total, completed, in_progress, pending, completion_percentage}` |

</details>

<details>
<summary><strong>✅ Tasks</strong> — MANAGER/ADMIN mutate · EMPLOYEE updates own status</summary>

| Method & Path | Notes |
|---------------|-------|
| `GET /api/tasks?status=&priority=&project_id=&assigned_to=` | Four-dimensional filtering |
| `POST /api/tasks` | Project + assignee must exist; blocked on `COMPLETED` projects |
| `PUT /api/tasks/{id}` | Managers: full edit · Employees: own `status` only (`403` otherwise) |
| `DELETE /api/tasks/{id}` | Remove |

</details>

<details>
<summary><strong>📈 Dashboard · Users · Health</strong></summary>

| Method & Path | Auth | Notes |
|---------------|------|-------|
| `GET /api/dashboard/summary` | JWT | Totals + task breakdown |
| `GET /api/users` | ADMIN | User management |
| `GET /api` · `GET /health` | — | API info · liveness probe |

</details>

### Example session

```bash
# 1. Register + log in
curl -X POST localhost:8000/api/auth/register -H 'Content-Type: application/json' \
  -d '{"username":"admin","email":"admin@x.com","password":"admin123","role":"ADMIN"}'
TOKEN=$(curl -s -X POST localhost:8000/api/auth/login \
  -d 'username=admin&password=admin123' | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

# 2. Department → employee → project → task
curl -X POST localhost:8000/api/departments -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Engineering"}'
curl -X POST localhost:8000/api/employees -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Alice","email":"alice@x.com","department_id":1}'
curl -X POST localhost:8000/api/projects -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"name":"Website","start_date":"2026-01-01","deadline":"2026-03-01"}'
curl -X POST localhost:8000/api/tasks -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"title":"Design homepage","project_id":1,"assigned_to":1,"priority":"HIGH"}'

# 3. Live progress
curl localhost:8000/api/projects/1/progress -H "Authorization: Bearer $TOKEN"
```

---

## 🧪 Testing

```bash
pytest -q
# 20 tests: auth · departments · employees · projects (+progress) · tasks (+RBAC)
```

Tests run against an **isolated in-memory SQLite DB** — `tests/conftest.py` overrides the
`get_db` dependency and rebuilds the schema per test, so your dev database is never touched.

---

## 🗄️ Database Migrations

```bash
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
alembic downgrade -1    # roll back one step
```

The initial schema lives in `alembic/versions/0001_initial.py` and reads `DATABASE_URL`
from settings, so the same migrations target SQLite locally and PostgreSQL in Docker.

---

## 🗂️ Project Structure

```
employee-task-management-system/
├── app/
│   ├── main.py                 # FastAPI entrypoint, routers, error handlers
│   ├── config/                 # settings (env) + database engine/session
│   ├── models/                 # SQLAlchemy: user, employee, department, project, task
│   ├── schemas/                # Pydantic request/response validation
│   ├── routers/                # thin HTTP layer: auth, users, employees, ...
│   ├── services/               # business rules + RBAC checks
│   ├── repositories/           # DB access only (no business logic)
│   └── utils/                  # JWT/bcrypt, auth dependencies, AppError types
├── frontend/                   # enterprise-style UI (see below)
├── tests/                      # pytest suite (auth, employees, departments, projects, tasks)
├── alembic/                    # migrations (env.py reads DATABASE_URL)
├── docs/screenshots/           # UI screenshots used above
├── Dockerfile
├── docker-compose.yml          # api + postgres:16
├── requirements.txt
├── run.py                      # python run.py → local dev server
└── INTERVIEW_PREPARATION.md · PROJECT_DEMO.md
```

---

## 🖥️ Frontend

Enterprise-style UI (Inter typeface, navy/gold identity) in [`frontend/`](frontend/):
landing, sign-in/register with remember-me, KPI dashboard, workforce directory,
department cards, project pipeline + detail view, and a filterable task board.
Shared design system in `css/style.css`; API client, icons, toasts, modals and
menus in `js/common.js`. **Every number shown comes from the API** — no invented
statistics. Tokens persist in `localStorage` ("Remember me") or `sessionStorage`;
production deployments should prefer httpOnly cookies.

---

## 🗺️ Roadmap

- [ ] Refresh tokens + logout blacklist; httpOnly cookie transport
- [ ] Pagination metadata, sorting and full-text search
- [ ] User admin UI (activate/deactivate, change role)
- [ ] Task comments, history and file attachments
- [ ] CI pipeline (lint + tests), rate limiting, structured JSON logging

---

## 🎤 Interview Kit

Presenting this project? Two guides are included:

- **[INTERVIEW_PREPARATION.md](INTERVIEW_PREPARATION.md)** — architecture rationale, JWT/RBAC
  deep-dives, likely questions, bugs encountered and how they were fixed
- **[PROJECT_DEMO.md](PROJECT_DEMO.md)** — a 5–7 minute live demo script

---

<div align="center">

**ETMS** · *People. Projects. Progress.* · Built with Python, FastAPI & PostgreSQL

</div>
