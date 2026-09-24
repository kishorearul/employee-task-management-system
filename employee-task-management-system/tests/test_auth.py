"""Auth tests: register, login, wrong password, unauthorized access."""
from tests.conftest import auth_header, login, register


def test_register_and_login(client):
    assert register(client, "admin1", "admin1@x.com").status_code == 201
    resp = login(client, "admin1")
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_register_duplicate_username_conflict(client):
    register(client, "dup", "a@x.com")
    assert register(client, "dup", "b@x.com").status_code == 409


def test_login_invalid_password(client):
    register(client, "u1", "u1@x.com")
    assert login(client, "u1", "wrongpass").status_code == 401


def test_me_requires_auth(client):
    assert client.get("/api/auth/me").status_code in (401, 403)


def test_me_with_token(client):
    register(client, "me1", "me1@x.com")
    token = login(client, "me1").json()["access_token"]
    resp = client.get("/api/auth/me", headers=auth_header(token))
    assert resp.status_code == 200
    assert resp.json()["username"] == "me1"
