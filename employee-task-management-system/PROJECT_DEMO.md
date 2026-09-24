# Project Demo Script (5–7 minutes)

## 0. Setup (before the call)

- `docker compose up --build` (or `uvicorn app.main:app --reload`)
- Open `http://localhost:8000/docs` and `frontend/login.html`

## 1. Hook (30s)

"This is an enterprise task & project tracker with JWT + role-based access:
admins manage everything, managers run projects, employees update only their own tasks."

## 2. Architecture (45s)

Show README diagram. Point at `app/routers`, `app/services`, `app/repositories`,
`app/models`, `app/utils/dependencies.py`. "Routers are thin; rules live in services."

## 3. Auth (60s)

1. POST /api/auth/register (ADMIN) → 201.
2. POST /api/auth/login → copy token, click Authorize in Swagger.
3. GET /api/auth/me → current user. Mention bcrypt hashing + expiring JWT.

## 4. Happy path (90s)

1. POST /api/departments `{"name":"Engineering"}` → 201; repeat → 409.
2. POST /api/employees (Alice) → 201.
3. POST /api/projects (deadline before start → 422; fix → 201).
4. POST /api/tasks assigned to Alice → 201.
5. GET /api/projects/1/progress → totals + 0%.
6. PUT /api/tasks/1 `{"status":"COMPLETED"}` → progress now 100%.

## 5. RBAC (60s)

Login as EMPLOYEE: POST /api/projects → 403; PUT another employee's task → 403;
PUT own task status → 200. "Permissions are enforced server-side."

## 6. Tests + migrations + Docker (45s)

- `pytest -q` → 20 passed.
- `alembic upgrade head` → initial schema.
- `docker compose config` / running containers.

## 7. Close (30s)

"If I had more time: refresh tokens, task comments, CI. Code is in layered,
interview-readable modules — happy to walk through any file."
