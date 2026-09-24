"""Project tests: CRUD + date rule + RBAC + progress calculation."""
from tests.conftest import auth_header, login, register


def _token(client, username, role):
    register(client, username, f"{username}@x.com", role=role)
    return auth_header(login(client, username).json()["access_token"])


def test_project_crud_and_date_rule(client):
    h = _token(client, "mgr", "MANAGER")
    ok = client.post("/api/projects", json={"name": "P1", "start_date": "2026-01-01",
                                             "deadline": "2026-02-01"}, headers=h)
    assert ok.status_code == 201
    pid = ok.json()["id"]
    # deadline before start -> 422 from Pydantic validation
    bad = client.post("/api/projects", json={"name": "Pbad", "start_date": "2026-02-01",
                                              "deadline": "2026-01-01"}, headers=h)
    assert bad.status_code == 422
    assert client.put(f"/api/projects/{pid}", json={"status": "IN_PROGRESS"}, headers=h).status_code == 200
    assert client.delete(f"/api/projects/{pid}", headers=h).status_code == 204


def test_employee_cannot_create_project(client):
    h = _token(client, "emp1", "EMPLOYEE")
    assert client.post("/api/projects", json={"name": "No"}, headers=h).status_code == 403


def test_project_progress(client):
    mgr = _token(client, "mgr2", "MANAGER")
    admin = _token(client, "adm2", "ADMIN")
    pid = client.post("/api/projects", json={"name": "PP"}, headers=mgr).json()["id"]
    emp = client.post("/api/employees", json={"name": "Emp", "email": "e@x.com"}, headers=admin).json()
    t1 = client.post("/api/tasks", json={"title": "Task One", "project_id": pid,
                                          "assigned_to": emp["id"]}, headers=mgr).json()
    client.post("/api/tasks", json={"title": "Task Two", "project_id": pid}, headers=mgr)
    client.put(f"/api/tasks/{t1['id']}", json={"status": "COMPLETED"}, headers=mgr)
    prog = client.get(f"/api/projects/{pid}/progress", headers=mgr).json()
    assert prog["total_tasks"] == 2
    assert prog["completed_tasks"] == 1
    assert prog["completion_percentage"] == 50.0
