/* Projects: search + status filter + pagination, live progress per visible
 * row, view (detail page) / create / edit modals, confirm-to-delete. */
"use strict";

let projAll = [];
let userMap = {};
let projPage = 1;
let projPerPage = 10;
let canManage = false;
let isAdmin = false;

document.getElementById("addIc").innerHTML = icon("plus", 16);

function filtered() {
  const q = document.getElementById("q").value.trim().toLowerCase();
  const st = document.getElementById("fltStatus").value;
  return projAll.filter((p) => {
    if (st && p.status !== st) return false;
    if (!q) return true;
    return [p.name, p.description].some((v) => (v || "").toLowerCase().includes(q));
  });
}

async function render() {
  const rows = document.getElementById("rows");
  const list = filtered();
  const { rows: pageRows, page, pages, total } = paginate(list, projPage, projPerPage);
  projPage = page;
  if (!total) {
    rows.innerHTML = emptyState({ title: "No projects found",
      message: projAll.length ? "Try adjusting your search or filters."
        : "Create your first project to start tracking delivery.",
      actionLabel: canManage && !projAll.length ? "New project" : null, action: "openProjectModal()" });
    document.getElementById("pager").innerHTML = "";
    return;
  }
  rows.innerHTML = skeletonRows(7, pageRows.length);
  const withProgress = await Promise.all(pageRows.map(async (p) => {
    const pr = await api(`/api/projects/${p.id}/progress`);
    return { p, pr: pr.ok ? pr.data : null };
  }));
  rows.innerHTML = withProgress.map(({ p, pr }) => {
    const pct = pr ? pr.completion_percentage : 0;
    const done = pr ? `${pr.completed_tasks}/${pr.total_tasks}` : "—";
    return `<tr><td><a href="project.html?id=${p.id}" class="cell-main" style="text-decoration:none;color:inherit">${esc(p.name)}</a>` +
      (p.description ? `<br><span class="cell-sub">${esc(p.description.slice(0, 60))}${p.description.length > 60 ? "…" : ""}</span>` : "") + `</td>` +
      `<td>${esc(userMap[p.manager_id] || "—")}</td><td>${statusBadge(p.status)}</td>` +
      `<td><span class="progress-cell"><span class="progress"><span style="width:${pct}%"></span></span><small>${pct}%</small></span></td>` +
      `<td>${done}</td><td>${fmtDate(p.deadline)}</td>` +
      `<td><div class="menu-anchor"><button class="icon-btn" style="color:var(--color-muted)" onclick="toggleMenu('mp${p.id}',event)" aria-label="Actions for ${esc(p.name)}" aria-haspopup="true" aria-expanded="false">${icon("dots", 17)}</button>` +
      `<div class="menu" id="mp${p.id}" role="menu">` +
      `<button onclick="location.href='project.html?id=${p.id}'" role="menuitem">${icon("eye", 15)} View</button>` +
      (canManage ? `<button onclick="openProjectModal(${p.id})" role="menuitem">${icon("pencil", 15)} Edit</button>` +
        `<button class="danger-item" onclick="deleteProject(${p.id},'${esc(p.name).replace(/'/g, "\\'")}')" role="menuitem">${icon("trash", 15)} Delete</button>` : "") +
      `</div></div></td></tr>`;
  }).join("");
  document.getElementById("pager").innerHTML = pagerHtml("proj", page, pages, total, projPerPage);
}
function projGoto(p) { projPage = p; render(); }

function projectFormHtml(p) {
  const mgrOpts = isAdmin
    ? `<div class="f-field"><label class="f-label" for="fMgr">Manager</label><select class="f-input" id="fMgr">` +
      `<option value="">— Unassigned —</option>` +
      Object.entries(userMap).map(([id, n]) =>
        `<option value="${id}"${p && String(p.manager_id) === String(id) ? " selected" : ""}>${esc(n)}</option>`).join("") +
      `</select></div>` : "";
  const statusRow = p
    ? `<div class="f-field"><label class="f-label" for="fStatus">Status</label><select class="f-input" id="fStatus">` +
      ["PLANNED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"].map((s) =>
        `<option value="${s}"${p.status === s ? " selected" : ""}>${friendlyStatus(s)}</option>`).join("") +
      `</select></div>` : "";
  return modalHead(p ? "Edit project" : "New project", p ? p.name : "Define scope, owner and timeline") +
    `<div class="modal-body"><form id="projForm" novalidate>` +
    `<div class="f-field"><label class="f-label" for="fName">Project name *</label>` +
    `<input class="f-input" id="fName" value="${esc(p?.name || "")}" placeholder="e.g. Website relaunch" required></div>` +
    `<div class="f-field"><label class="f-label" for="fDesc">Description</label>` +
    `<textarea class="f-input" id="fDesc" placeholder="Goals, scope, stakeholders…">${esc(p?.description || "")}</textarea></div>` +
    mgrOpts +
    `<div class="f-row"><div class="f-field"><label class="f-label" for="fStart">Start date</label>` +
    `<input class="f-input" id="fStart" type="date" value="${esc(p?.start_date || "")}"></div>` +
    `<div class="f-field"><label class="f-label" for="fEnd">Deadline</label>` +
    `<input class="f-input" id="fEnd" type="date" value="${esc(p?.deadline || "")}"></div></div>` +
    statusRow +
    `<div class="f-error" id="projFormError" role="alert"></div>` +
    `</form></div><div class="modal-foot">` +
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>` +
    `<button class="btn btn-primary" id="projSave">${p ? "Save changes" : "Create project"}</button></div>`;
}

async function openProjectModal(id) {
  const p = id ? projAll.find((x) => x.id === id) : null;
  if (id) closeAllMenus();
  openModal(projectFormHtml(p));
  document.getElementById("projSave").onclick = async (ev) => {
    const btn = ev.currentTarget;
    const name = document.getElementById("fName").value.trim();
    const start = document.getElementById("fStart").value || null;
    const deadline = document.getElementById("fEnd").value || null;
    const errBox = document.getElementById("projFormError");
    if (!name) { errBox.textContent = "Project name is required."; errBox.classList.add("show"); return; }
    if (start && deadline && deadline < start) {
      errBox.textContent = "Deadline must not be earlier than the start date."; errBox.classList.add("show"); return;
    }
    setBtnLoading(btn, true);
    const body = { name,
      description: document.getElementById("fDesc").value.trim() || null,
      start_date: start, deadline };
    if (isAdmin) {
      const mgr = document.getElementById("fMgr");
      if (mgr) body.manager_id = mgr.value ? +mgr.value : null;
    }
    const st = document.getElementById("fStatus");
    if (st) body.status = st.value;
    const res = p ? await api(`/api/projects/${p.id}`, { method: "PUT", body })
                  : await api("/api/projects", { method: "POST", body });
    setBtnLoading(btn, false);
    if (!res.ok) { errBox.textContent = errDetail(res); errBox.classList.add("show"); return; }
    closeModal();
    toast(p ? "Project updated" : "Project created", `${res.data.name} saved successfully.`, "success");
    await reload();
  };
}

async function deleteProject(id, name) {
  closeAllMenus();
  const ok = await confirmDialog({ title: "Delete project?",
    message: `Delete ${name} and all of its tasks? This action cannot be undone.` });
  if (!ok) return;
  const res = await api(`/api/projects/${id}`, { method: "DELETE" });
  if (!res.ok) { toast("Unable to delete project", errDetail(res), "error"); return; }
  toast("Project deleted", `${name} was removed.`, "success");
  await reload();
}

async function reload() {
  document.getElementById("rows").innerHTML = skeletonRows(7, 6);
  const [projs, users] = await Promise.all([api("/api/projects?limit=1000"), api("/api/users?limit=1000")]);
  if (!projs.ok) {
    document.getElementById("rows").innerHTML = errorState(errDetail(projs));
    document.getElementById("pager").innerHTML = "";
    return;
  }
  projAll = projs.data;
  if (users.ok) userMap = Object.fromEntries(users.data.map((u) => [u.id, u.username]));
  projPage = 1;
  await render();
}

(async () => {
  document.getElementById("rows").innerHTML = skeletonRows(7, 6);
  const user = await initShell();
  if (!user) return;
  canManage = user.role === "ADMIN" || user.role === "MANAGER";
  isAdmin = user.role === "ADMIN";
  document.getElementById("q").addEventListener("input", debounce(() => { projPage = 1; render(); }, 200));
  document.getElementById("fltStatus").addEventListener("change", () => { projPage = 1; render(); });
  document.getElementById("perPage").addEventListener("change", (e) => { projPerPage = +e.target.value; projPage = 1; render(); });
  projPerPage = +document.getElementById("perPage").value;
  await reload();
})();
