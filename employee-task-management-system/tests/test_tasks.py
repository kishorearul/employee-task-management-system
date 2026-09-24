"""Task tests: create/assign/update/delete + RBAC + invalid FKs."""
from tests.conftest import auth_header, login, register


def _setup(client):
    register(client, "admin", "admin@x.com", role="ADMIN")
    register(client, "mgr", "mgr@x.com", role="MANAGER")
    register(client, "emp", "emp@x.com", role="EMPLOYEE")
    admin = auth_header(login(client, "admin").json()["access_token"])
    mgr = auth_header(login(client, "mgr").json()["access_token"])
    emp_tok = auth_header(login(client, "emp").json()["access_token"])
    pid = client.post("/api/projects", json={"name": "Proj"}, headers=mgr).json()["id"]
    # Link employee user to employee profile so "own task" checks work.
    me = client.get("/api/auth/me", headers=emp_tok).json()
    emp = client.post("/api/employees",
                      json={"name": "Emp", "email": "emp@x.com", "user_id": me["id"]},
                      headers=admin).json()
    return admin, mgr, emp_tok, pid, emp


def test_task_crud_and_filters(client):
    admin, mgr, _, pid, emp = _setup(client)
    t = client.post("/api/tasks", json={"title": "Task Alpha", "project_id": pid,
                                         "assigned_to": emp["id"], "priority": "HIGH"},
                    headers=mgr)
    assert t.status_code == 201
    tid = t.json()["id"]
    assert client.get(f"/api/tasks?priority=HIGH", headers=mgr).status_code == 200
    assert client.get(f"/api/tasks?project_id={pid}", headers=mgr).status_code == 200
    assert client.put(f"/api/tasks/{tid}", json={"status": "IN_PROGRESS"}, headers=mgr).status_code == 200
    assert client.delete(f"/api/tasks/{tid}", headers=mgr).status_code == 204


def test_task_invalid_project_and_employee(client):
    _, mgr, _, pid, _ = _setup(client)
    assert client.post("/api/tasks", json={"title": "Task X", "project_id": 9999}, headers=mgr).status_code == 400
    assert client.post("/api/tasks", json={"title": "Task X", "project_id": pid, "assigned_to": 9999},
                       headers=mgr).status_code == 400


def test_employee_can_update_own_status_only(client):
    admin, mgr, emp_tok, pid, emp = _setup(client)
    tid = client.post("/api/tasks", json={"title": "My Task", "project_id": pid,
                                           "assigned_to": emp["id"]}, headers=mgr).json()["id"]
    # Allowed: own status change.
    assert client.put(f"/api/tasks/{tid}", json={"status": "COMPLETED"}, headers=emp_tok).status_code == 200
    # Forbidden: change title as employee.
    assert client.put(f"/api/tasks/{tid}", json={"title": "Hack"}, headers=emp_tok).status_code == 403
    # Forbidden: create tasks as employee.
    assert client.post("/api/tasks", json={"title": "Task No", "project_id": pid},
                       headers=emp_tok).status_code == 403


def test_employee_cannot_touch_others_tasks(client):
    admin, mgr, emp_tok, pid, emp = _setup(client)
    other = client.post("/api/employees", json={"name": "Other", "email": "o@x.com"}, headers=admin).json()
    tid = client.post("/api/tasks", json={"title": "Other Task", "project_id": pid,
                                           "assigned_to": other["id"]}, headers=mgr).json()["id"]
    assert client.put(f"/api/tasks/{tid}", json={"status": "COMPLETED"}, headers=emp_tok).status_code == 403
