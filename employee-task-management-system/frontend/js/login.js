/* Login / register. Remember-me controls token persistence:
 * checked → localStorage (survives restarts), unchecked → sessionStorage. */
"use strict";

document.getElementById("apiShown").textContent = API;

// Pillar + proof icons (same stroke set as the app shell).
document.getElementById("pil1").insertAdjacentHTML("afterbegin", icon("users", 20));
document.getElementById("pil2").insertAdjacentHTML("afterbegin", icon("briefcase", 20));
document.getElementById("pil3").insertAdjacentHTML("afterbegin", icon("checksquare", 20));
document.getElementById("pil4").insertAdjacentHTML("afterbegin", icon("chart", 20));
["proof1", "proof2", "proof3"].forEach((id) => {
  document.getElementById(id).insertAdjacentHTML("afterbegin", icon("check", 14));
});

// Already signed in with a valid token? Skip to the dashboard.
(async () => {
  if (!getToken()) return;
  const me = await api("/api/auth/me");
  if (me.ok) window.location.href = "dashboard.html";
})();

function showTab(which) {
  const login = which === "login";
  document.getElementById("loginForm").style.display = login ? "" : "none";
  document.getElementById("registerForm").style.display = login ? "none" : "";
  document.getElementById("tabLogin").classList.toggle("on", login);
  document.getElementById("tabRegister").classList.toggle("on", !login);
  document.getElementById("tabLogin").setAttribute("aria-selected", login);
  document.getElementById("tabRegister").setAttribute("aria-selected", !login);
}

function fieldError(id, message) {
  const el = document.getElementById(id);
  el.textContent = message || "";
  el.classList.toggle("show", !!message);
}

function changeApi(ev) {
  ev.preventDefault();
  const next = window.prompt("API server base URL (e.g. http://localhost:8000):", API);
  if (next && next.trim()) {
    localStorage.setItem("apiBase", next.trim().replace(/\/$/, ""));
    window.location.reload();
  }
}

function forgotPassword(ev) {
  ev.preventDefault();
  // No self-service reset on the backend — say so honestly.
  toast("Password reset", "Self-service reset is not enabled. Please contact your administrator.", "info");
}

async function doLogin(ev) {
  ev.preventDefault();
  fieldError("loginError", "");
  const btn = document.getElementById("loginBtn");
  setBtnLoading(btn, true, "Signing in…");
  try {
    // OAuth2 password flow expects form-encoded fields.
    const form = new URLSearchParams({
      username: document.getElementById("username").value.trim(),
      password: document.getElementById("password").value,
    });
    const res = await fetch(API + "/api/auth/login", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      fieldError("loginError", typeof data.detail === "string" ? data.detail : "Sign in failed. Check your credentials and try again.");
      return false;
    }
    setToken(data.access_token, document.getElementById("remember").checked);
    window.location.href = "dashboard.html";
  } catch (_) {
    fieldError("loginError", "Cannot reach the server at " + API + ". Check your connection and retry.");
  } finally {
    setBtnLoading(btn, false);
  }
  return false;
}

async function doRegister(ev) {
  ev.preventDefault();
  fieldError("regError", "");
  const btn = document.getElementById("regBtn");
  setBtnLoading(btn, true, "Creating account…");
  try {
    const result = await api("/api/auth/register", {
      method: "POST",
      body: {
        username: document.getElementById("r_user").value.trim(),
        email: document.getElementById("r_email").value.trim(),
        password: document.getElementById("r_pass").value,
        role: document.getElementById("r_role").value,
      },
    });
    if (!result.ok) {
      fieldError("regError", errDetail(result, "Registration failed."));
      return false;
    }
    toast("Account created", "Signed up as " + result.data.username + ". Please sign in.", "success");
    showTab("login");
    document.getElementById("username").value = result.data.username;
  } finally {
    setBtnLoading(btn, false);
  }
  return false;
}
