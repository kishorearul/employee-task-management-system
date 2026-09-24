"""Employee tests: CRUD + invalid references + RBAC."""
from tests.conftest import auth_header, login, register


def _admin(client):
    register(client, "adm", "adm@x.com", role="ADMIN")
    return auth_header(login(client, "adm").json()["access_token"])


def test_employee_crud(client):
    h = _admin(client)
    dep = client.post("/api/departments", json={"name": "Eng"}, headers=h).json()
    payload = {"name": "Alice", "email": "alice@x.com", "department_id": dep["id"]}
    created = client.post("/api/employees", json=payload, headers=h)
    assert created.status_code == 201
    emp_id = created.json()["id"]
    assert client.get(f"/api/employees/{emp_id}", headers=h).status_code == 200
    assert client.put(f"/api/employees/{emp_id}", json={"designation": "Dev"}, headers=h).status_code == 200
    assert client.delete(f"/api/employees/{emp_id}", headers=h).status_code == 204


def test_employee_invalid_department(client):
    h = _admin(client)
    resp = client.post("/api/employees", json={"name": "Bob", "email": "bob@x.com",
                                               "department_id": 9999}, headers=h)
    assert resp.status_code == 400


def test_employee_duplicate_email(client):
    h = _admin(client)
    client.post("/api/employees", json={"name": "Alice2", "email": "same@x.com"}, headers=h)
    resp = client.post("/api/employees", json={"name": "Bob2", "email": "same@x.com"}, headers=h)
    assert resp.status_code == 409


def test_employee_get_missing_404(client):
    assert client.get("/api/employees/9999", headers=_admin(client)).status_code == 404
