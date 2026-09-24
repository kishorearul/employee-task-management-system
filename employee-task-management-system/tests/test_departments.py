"""Department tests: CRUD + duplicate-name + RBAC."""
from tests.conftest import auth_header, login, register


def _admin(client):
    register(client, "adm", "adm@x.com", role="ADMIN")
    return auth_header(login(client, "adm").json()["access_token"])


def _employee(client):
    register(client, "emp", "emp@x.com", role="EMPLOYEE")
    return auth_header(login(client, "emp").json()["access_token"])


def test_department_crud(client):
    h = _admin(client)
    created = client.post("/api/departments", json={"name": "Eng", "description": "d"}, headers=h)
    assert created.status_code == 201
    dep_id = created.json()["id"]
    assert client.get(f"/api/departments/{dep_id}", headers=h).status_code == 200
    assert client.put(f"/api/departments/{dep_id}", json={"name": "Eng2"}, headers=h).status_code == 200
    assert client.delete(f"/api/departments/{dep_id}", headers=h).status_code == 204


def test_duplicate_department_name_rejected(client):
    h = _admin(client)
    client.post("/api/departments", json={"name": "HR"}, headers=h)
    assert client.post("/api/departments", json={"name": "HR"}, headers=h).status_code == 409


def test_employee_cannot_create_department(client):
    register(client, "adm2", "adm2@x.com", role="ADMIN")
    h = _employee(client)
    assert client.post("/api/departments", json={"name": "X"}, headers=h).status_code == 403


def test_get_missing_department_404(client):
    assert client.get("/api/departments/9999", headers=_admin(client)).status_code == 404
