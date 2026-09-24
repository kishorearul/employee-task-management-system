/* ETMS shared frontend core.
 * - Same-origin API client with JWT (localStorage, or sessionStorage
 *   when "Remember me" is unchecked — see login.js).
 * - Icons (inline SVG, Lucide-style stroke icons — no CDN dependency).
 * - Toasts, modals, confirm dialogs, actions menus, pager, state blocks.
 * - App shell wiring: active nav, collapse, mobile drawer, user chip,
 *   header search, role gating. Backend still enforces all permissions.
 */
"use strict";

/* ---------------- API base ---------------- */
const API = (() => {
  const saved = (localStorage.getItem("apiBase") || "").trim().replace(/\/$/, "");
  if (saved) return saved;
  if (window.location.protocol === "file:") return "http://localhost:8000";
  if (window.location.origin && window.location.origin !== "null") return window.location.origin;
  return "http://localhost:8000";
})();

/* ---------------- Token store (remember-me aware) ---------------- */
function getToken() {
  return localStorage.getItem("etms_token") || sessionStorage.getItem("etms_token") || "";
}
function setToken(token, remember) {
  if (remember) localStorage.setItem("etms_token", token);
  else sessionStorage.setItem("etms_token", token);
}
function logout() {
  localStorage.removeItem("etms_token");
  localStorage.removeItem("token"); // legacy key from previous UI version
  sessionStorage.removeItem("etms_token");
  window.location.href = "login.html";
}

/* ---------------- API client ---------------- */
async function api(path, { method = "GET", body = null } = {}) {
  const headers = {};
  if (body !== null) headers["Content-Type"] = "application/json";
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;
  let res;
  try {
    res = await fetch(API + path, {
      method, headers, body: body !== null ? JSON.stringify(body) : null,
    });
  } catch (err) {
    return { ok: false, status: 0, data: { detail: "Cannot reach the server. Check your connection and retry." } };
  }
  let data = null;
  try { data = await res.json(); } catch (_) { data = null; }
  if (res.status === 401 && token) {
    logout();
    return { ok: false, status: 401, data: { detail: "Your session has expired. Please sign in again." } };
  }
  return { ok: res.ok, status: res.status, data };
}

/** Human-readable message from an API result. Hides raw internals. */
function errDetail(result, fallback) {
  if (!result) return fallback || "Something went wrong.";
  if (result.status === 0) return (result.data && result.data.detail) || fallback || "Network error.";
  const d = result.data && result.data.detail;
  if (Array.isArray(d)) {
    return d.map((e) => {
      const where = Array.isArray(e.loc) ? e.loc.slice(1).join(".") : "";
      return (where ? where + ": " : "") + (e.msg || "invalid value");
    }).join("; ");
  }
  if (typeof d === "string" && d) return d;
  const byStatus = { 400: "Invalid request.", 401: "Please sign in again.",
    403: "You do not have permission to do that.", 404: "Record not found.",
    409: "This record already exists.", 422: "Some fields are invalid." };
  return byStatus[result.status] || fallback || "Something went wrong.";
}

/* ---------------- Formatting helpers ---------------- */
function esc(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value.length <= 10 ? value + "T00:00:00" : value);
  if (isNaN(d)) return esc(value);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function initials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
function debounce(fn, ms) {
  let t = null;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}
function friendlyStatus(s) {
  return { TODO: "To Do", IN_PROGRESS: "In Progress", COMPLETED: "Completed",
    PLANNED: "Planned", ON_HOLD: "On Hold" }[s] || s;
}
/** Correct singular/plural without inventing data: plural(1,"project") → "1 project". */
function plural(n, one, many) {
  return `${n} ${n === 1 ? one : (many || one + "s")}`;
}

/* ---------------- Icons (inline SVG, 24 viewBox, stroke) ---------------- */
const ICON_PATHS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="1.5"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01"/>',
  briefcase: '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checksquare: '<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  dots: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>',
  chevR: '<path d="m9 18 6-6-6-6"/>',
  chevD: '<path d="m6 9 6 6 6-6"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
  chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 13v4M12 9v8M17 5v12"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  collapse: '<path d="m11 17-5-5 5-5M18 17l-5-5 5-5"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
};
function icon(name, size) {
  const s = size || 18;
  return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
    `stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ""}</svg>`;
}

/* ---------------- Badges ---------------- */
function statusBadge(status) {
  const cls = { TODO: "b-todo", IN_PROGRESS: "b-progress", COMPLETED: "b-completed",
    PLANNED: "b-planned", ON_HOLD: "b-hold" }[status] || "b-todo";
  return `<span class="badge ${cls}"><span class="dot"></span>${esc(friendlyStatus(status))}</span>`;
}
function priorityBadge(priority) {
  const cls = { HIGH: "b-high", MEDIUM: "b-medium", LOW: "b-low" }[priority] || "b-low";
  const label = { HIGH: "High", MEDIUM: "Medium", LOW: "Low" }[priority] || priority;
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}
function roleBadge(role) {
  const cls = { ADMIN: "b-admin", MANAGER: "b-manager", EMPLOYEE: "b-employee" }[role] || "b-employee";
  const label = { ADMIN: "Administrator", MANAGER: "Manager", EMPLOYEE: "Employee" }[role] || role;
  return `<span class="badge ${cls}">${esc(label)}</span>`;
}

/* ---------------- Toasts ---------------- */
function toast(title, message, kind) {
  let host = document.getElementById("toasts");
  if (!host) { host = document.createElement("div"); host.id = "toasts"; document.body.appendChild(host); }
  const el = document.createElement("div");
  el.className = "toast " + (kind || "info");
  el.setAttribute("role", "status");
  const ic = kind === "success" ? "check" : kind === "error" ? "alert" : "info";
  el.innerHTML = `<span class="t-icon">${icon(ic, 17)}</span>` +
    `<div><strong>${esc(title)}</strong>${message ? `<span>${esc(message)}</span>` : ""}</div>`;
  host.appendChild(el);
  setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity 200ms"; }, 3600);
  setTimeout(() => el.remove(), 3900);
}

/* ---------------- Modal + confirm dialog ---------------- */
let _modalLastFocus = null;
function openModal(html, { small = false, labelledBy = "modalTitle" } = {}) {
  closeModal();
  _modalLastFocus = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay open";
  overlay.id = "modalOverlay";
  overlay.innerHTML = `<div class="modal${small ? " modal-sm" : ""}" role="dialog" aria-modal="true" aria-labelledby="${labelledBy}">${html}</div>`;
  overlay.addEventListener("mousedown", (e) => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";
  const first = overlay.querySelector("input, select, textarea, button.btn-primary, button");
  if (first) first.focus();
  return overlay;
}
function closeModal() {
  const overlay = document.getElementById("modalOverlay");
  if (overlay) overlay.remove();
  document.body.style.overflow = "";
  if (_modalLastFocus && _modalLastFocus.focus) _modalLastFocus.focus();
  _modalLastFocus = null;
}
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeModal(); closeAllMenus(); } });

function modalHead(title, sub) {
  return `<div class="modal-head"><div style="flex:1"><h3 id="modalTitle">${esc(title)}</h3>` +
    (sub ? `<div class="sub">${esc(sub)}</div>` : "") + `</div>` +
    `<button class="icon-btn" style="color:var(--color-muted)" onclick="closeModal()" aria-label="Close dialog">${icon("x", 17)}</button></div>`;
}
/** Professional replacement for confirm(): returns Promise<boolean>. */
function confirmDialog({ title, message, confirmLabel = "Delete", danger = true }) {
  return new Promise((resolve) => {
    const overlay = openModal(
      modalHead(title) +
      `<div class="modal-body"><div style="display:flex;gap:13px;align-items:flex-start">` +
      `<span class="confirm-icon">${icon("alert", 20)}</span><p style="margin:2px 0 0;color:var(--color-muted)">${esc(message)}</p>` +
      `</div></div>` +
      `<div class="modal-foot"><button class="btn btn-secondary" id="cfCancel">Cancel</button>` +
      `<button class="btn ${danger ? "btn-danger" : "btn-primary"}" id="cfOk">${esc(confirmLabel)}</button></div>`,
      { small: true });
    const done = (v) => { closeModal(); resolve(v); };
    overlay.querySelector("#cfCancel").onclick = () => done(false);
    overlay.querySelector("#cfOk").onclick = () => done(true);
  });
}
/** Button loading helper: setBtnLoading(btn, true) swaps label for a spinner. */
function setBtnLoading(btn, loading, label) {
  if (!btn) return;
  if (loading) { btn.disabled = true; btn.dataset.label = btn.innerHTML; btn.innerHTML = `<span class="spinner"></span> ${esc(label || "Saving…")}`; }
  else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
}

/* ---------------- Actions menu (three-dot dropdown) ---------------- */
function closeAllMenus() { document.querySelectorAll(".menu.open").forEach((m) => m.classList.remove("open")); }
document.addEventListener("click", (e) => {
  if (!e.target.closest(".menu-anchor")) closeAllMenus();
});
function toggleMenu(id, ev) {
  ev.stopPropagation();
  const m = document.getElementById(id);
  const was = m.classList.contains("open");
  closeAllMenus();
  if (!was) m.classList.add("open");
  const trigger = ev.currentTarget;
  if (trigger && trigger.setAttribute) {
    document.querySelectorAll('[aria-expanded="true"]').forEach((el) => el.setAttribute("aria-expanded", "false"));
    trigger.setAttribute("aria-expanded", String(!was));
  }
}

/* ---------------- State blocks: skeleton / empty / error ---------------- */
function skeletonRows(cols, n) {
  let html = "";
  for (let i = 0; i < (n || 5); i++) {
    html += `<tr class="skel-row">` + `<td colspan="${cols}"><div class="skel" style="height:14px;width:${88 - i * 7}%"></div></td>` + `</tr>`;
  }
  return html;
}
function emptyState({ title, message, actionLabel, action }) {
  return `<tr><td colspan="20"><div class="state-block"><span class="s-icon">${icon("inbox", 22)}</span>` +
    `<h3>${esc(title)}</h3><p>${esc(message)}</p>` +
    (actionLabel ? `<button class="btn btn-primary btn-sm" onclick="${action}">${icon("plus", 15)} ${esc(actionLabel)}</button>` : "") +
    `</div></td></tr>`;
}
function errorState(message) {
  return `<tr><td colspan="20"><div class="state-block"><span class="s-icon">${icon("alert", 22)}</span>` +
    `<h3>Unable to load data</h3><p>${esc(message)}</p>` +
    `<button class="btn btn-secondary btn-sm" onclick="location.reload()">Retry</button></div></td></tr>`;
}

/* ---------------- Client-side pager (backend uses skip/limit; pages fetch
   one bounded snapshot and paginate locally for search + paging UX) ---------------- */
function paginate(items, page, perPage) {
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(1, page), pages);
  return { rows: items.slice((p - 1) * perPage, p * perPage), page: p, pages, total };
}
function pagerHtml(prefix, page, pages, total, perPage) {
  const start = total === 0 ? 0 : (page - 1) * perPage + 1;
  const end = Math.min(total, page * perPage);
  return `<span>Showing <strong>${start}–${end}</strong> of <strong>${total}</strong></span><span class="spacer"></span>` +
    `<button class="btn btn-secondary btn-sm" ${page <= 1 ? "disabled" : ""} onclick="${prefix}Goto(${page - 1})" aria-label="Previous page">${icon("chevL", 15)}</button>` +
    `<span>Page ${page} of ${pages}</span>` +
    `<button class="btn btn-secondary btn-sm" ${page >= pages ? "disabled" : ""} onclick="${prefix}Goto(${page + 1})" aria-label="Next page">${icon("chevR", 15)}</button>`;
}

/* ---------------- Auth guard ---------------- */
function requireAuth() {
  if (!getToken()) { window.location.href = "login.html"; return ""; }
  return getToken();
}

/* ---------------- App shell wiring ---------------- */
async function initShell({ requires = null } = {}) {
  requireAuth();
  // Active nav + collapse restore
  const page = document.body.dataset.page;
  document.querySelectorAll(".nav a[data-nav]").forEach((a) => {
    if (a.dataset.nav === page) { a.classList.add("active"); a.setAttribute("aria-current", "page"); }
  });
  if (localStorage.getItem("etms_collapsed") === "1") document.body.classList.add("side-collapsed");

  const me = await api("/api/auth/me");
  if (!me.ok) return null; // api() redirects to login on 401
  const user = me.data;

  // Sidebar + topbar identity
  document.querySelectorAll("[data-user-name]").forEach((el) => { el.textContent = user.username; });
  const friendlyRole = { ADMIN: "Administrator", MANAGER: "Manager", EMPLOYEE: "Employee" }[user.role] || user.role;
  document.querySelectorAll("[data-user-avatar]").forEach((el) => { el.textContent = initials(user.username); });
  document.querySelectorAll("[data-user-role]").forEach((el) => { el.textContent = friendlyRole; });
  const av = document.getElementById("avatar");
  if (av) av.textContent = initials(user.username);
  const chipRole = document.getElementById("chipRole");
  if (chipRole) chipRole.textContent = friendlyRole;

  // Page-level role gate (e.g. Employees list is ADMIN/MANAGER-only server-side)
  if (requires && !requires.includes(user.role)) {
    document.querySelector("main.page").innerHTML =
      `<div class="card"><div class="state-block"><span class="s-icon">${icon("alert", 22)}</span>` +
      `<h3>Restricted area</h3><p>Your <strong>${esc(user.role)}</strong> role does not have access to this section. ` +
      `Contact your administrator if you need access.</p>` +
      `<a class="btn btn-secondary btn-sm" href="dashboard.html">Back to dashboard</a></div></div>`;
    return null;
  }
  // Hide nav entries + controls the role may not use (server still enforces)
  document.querySelectorAll("[data-requires]").forEach((el) => {
    const allowed = el.dataset.requires.split(",").map((s) => s.trim());
    if (!allowed.includes(user.role)) el.remove();
  });
  return user;
}

function toggleSidebar() {
  const collapsed = document.body.classList.toggle("side-collapsed");
  localStorage.setItem("etms_collapsed", collapsed ? "1" : "0");
}
function toggleMobileNav() { document.body.classList.toggle("nav-open"); }

/** Header global search: jumps to Tasks with the query applied. */
function headerSearch(ev) {
  ev.preventDefault();
  const q = document.getElementById("globalSearch").value.trim();
  sessionStorage.setItem("etms_task_search", q);
  document.body.classList.remove("nav-open");
  if (document.body.dataset.page === "tasks") window.dispatchEvent(new Event("etms:task-search"));
  else window.location.href = "tasks.html";
}
function toggleBell(ev) {
  ev.stopPropagation();
  document.getElementById("bellPanel").classList.toggle("open");
}
document.addEventListener("click", (e) => {
  const panel = document.getElementById("bellPanel");
  if (panel && panel.classList.contains("open") && !e.target.closest(".pop-anchor")) panel.classList.remove("open");
});
