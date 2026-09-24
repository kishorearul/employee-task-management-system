/* Tasks: search + project/status/priority/assignee filters + pagination,
 * full create/edit modal (employees see status-only, mirroring the server
 * rule), quick status actions, confirm-to-delete. Header search feeds the
 * search box via sessionStorage. */
"use strict";

let taskAll = [];
let projMap = {};
let empMap = {};
let taskPage = 1;
let taskPerPage = 10;
let canManage = false;
let userRole = "EMPLOYEE";

document.getElementById("addIc").innerHTML = icon("plus", 16);

function applyHeaderSearch() {
  const q = sessionStorage.getItem("etms_task_search");
  if (q !== null) {
    document.getElementById("q").value = q;
    sessionStorage.removeItem("etms_task_search");
    taskPage = 1;
  }
}
window.addEventListener("etms:task-search", () => { applyHeaderSearch(); render(); });

function filtered() {
  const q = document.getElementById("q").value.trim().toLowerCase();
  const pj = document.getElementById("fltProj").value;
  const st = document.getElementById("fltStatus").value;
  const pr = document.getElementById("fltPrio").value;
  const em = document.getElementById("fltEmp") ? document.getElementById("fltEmp").value : "";
  return taskAll.filter((t) => {
    if (pj && String(t.project_id) !== pj) return false;
    if (st && t.status !== st) return false;
    if (pr && t.priority !== pr) return false;
    if (em && String(t.assigned_to || "") !== em) return false;
    if (!q) return true;
    return [t.title, t.description].some((v) => (v || "").toLowerCase().includes(q));
  });
}

function render() {
  const rows = document.getElementById("rows");
  const list = filtered();
  const { rows: pageRows, page, pages, total } = paginate(list, taskPage, taskPerPage);
  taskPage = page;
  if (!total) {
    rows.innerHTML = emptyState({ title: "No tasks found",
      message: taskAll.length ? "Try adjusting your search or filters."
        : "Create your first task to start tracking delivery.",
      actionLabel: canManage && !taskAll.length ? "Create task" : null, action: "openTaskModal()" });
    document.getElementById("pager").innerHTML = "";
    return;
  }
  rows.innerHTML = pageRows.map((t) =>
    `<tr><td class="cell-main">${esc(t.title)}` +
    (t.description ? `<br><span class="cell-sub">${esc(t.description.slice(0, 60))}${t.description.length > 60 ? "…" : ""}</span>` : "") + `</td>` +
    `<td>${esc(projMap[t.project_id] || "—")}</td>` +
    `<td>${esc(empMap[t.assigned_to] || "Unassigned")}</td>` +
    `<td>${priorityBadge(t.priority)}</td><td>${statusBadge(t.status)}</td>` +
    `<td>${fmtDate(t.deadline)}</td><td style="white-space:nowrap">` +
    (t.status !== "COMPLETED" ? `<button class="btn btn-ghost btn-sm" onclick="setStatus(${t.id},'COMPLETED')" title="Mark completed">Done</button>` : "") +
    `<div class="menu-anchor"><button class="icon-btn" style="color:var(--color-muted)" onclick="toggleMenu('mt${t.id}',event)" aria-label="Actions for ${esc(t.title)}" aria-haspopup="true" aria-expanded="false">${icon("dots", 17)}</button>` +
    `<div class="menu" id="mt${t.id}" role="menu">` +
    (t.status !== "IN_PROGRESS" ? `<button onclick="setStatus(${t.id},'IN_PROGRESS')" role="menuitem">${icon("clock", 15)} Start</button>` : "") +
    `<button onclick="openTaskModal(${t.id})" role="menuitem">${icon("pencil", 15)} Edit</button>` +
    (canManage ? `<button class="danger-item" onclick="deleteTask(${t.id},'${esc(t.title).replace(/'/g, "\\'")}')" role="menuitem">${icon("trash", 15)} Delete</button>` : "") +
    `</div></div></td></tr>`).join("");
  document.getElementById("pager").innerHTML = pagerHtml("task", page, pages, total, taskPerPage);
}
function taskGoto(p) { taskPage = p; render(); }

function taskFormHtml(t) {
  const projOpts = Object.entries(projMap).map(([id, n]) =>
    `<option value="${id}"${t && String(t.project_id) === String(id) ? " selected" : ""}>${esc(n)}</option>`).join("");
  const empOpts = `<option value="">— Unassigned —</option>` + Object.entries(empMap).map(([id, n]) =>
    `<option value="${id}"${t && String(t.assigned_to) === String(id) ? " selected" : ""}>${esc(n)}</option>`).join("");
  const statusOpts = ["TODO", "IN_PROGRESS", "COMPLETED"].map((s) =>
    `<option value="${s}"${t && t.status === s ? " selected" : ""}>${friendlyStatus(s)}</option>`).join("");
  const prioOpts = ["LOW", "MEDIUM", "HIGH"].map((s) =>
    `<option value="${s}"${t && t.priority === s ? " selected" : ""}>${s[0] + s.slice(1).toLowerCase()}</option>`).join("");
  // Employees may only change status (server rule) — the form reflects that.
  const limited = userRole === "EMPLOYEE";
  return modalHead(t ? "Edit task" : "Create task", t ? t.title : "Assign work with clear ownership") +
    `<div class="modal-body"><form id="taskForm" novalidate>` +
    (limited
      ? `<div class="f-field"><label class="f-label" for="fStatus">Status</label><select class="f-input" id="fStatus">${statusOpts}</select>` +
        `<div class="f-help">As an employee you can update the status of your assigned tasks.</div></div>`
      : `<div class="f-field"><label class="f-label" for="fTitle">Task title *</label>` +
        `<input class="f-input" id="fTitle" value="${esc(t?.title || "")}" placeholder="e.g. Design homepage" required></div>` +
        `<div class="f-field"><label class="f-label" for="fDesc">Description</label>` +
        `<textarea class="f-input" id="fDesc" placeholder="Acceptance criteria, context, links…">${esc(t?.description || "")}</textarea></div>` +
        `<div class="f-row"><div class="f-field"><label class="f-label" for="fProj">Project *</label><select class="f-input" id="fProj">${projOpts || `<option value="">— No projects —</option>`}</select></div>` +
        `<div class="f-field"><label class="f-label" for="fEmp">Assigned to</label><select class="f-input" id="fEmp">${empOpts}</select></div></div>` +
        `<div class="f-row"><div class="f-field"><label class="f-label" for="fPrio">Priority</label><select class="f-input" id="fPrio">${prioOpts}</select></div>` +
        `<div class="f-field"><label class="f-label" for="fDue">Deadline</label><input class="f-input" id="fDue" type="date" value="${esc(t?.deadline || "")}"></div></div>` +
        (t ? `<div class="f-field"><label class="f-label" for="fStatus">Status</label><select class="f-input" id="fStatus">${statusOpts}</select></div>` : "")) +
    `<div class="f-error" id="taskFormError" role="alert"></div>` +
    `</form></div><div class="modal-foot">` +
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>` +
    `<button class="btn btn-primary" id="taskSave">${t ? "Save changes" : "Create task"}</button></div>`;
}

async function openTaskModal(id) {
  const t = id ? taskAll.find((x) => x.id === id) : null;
  if (id) closeAllMenus();
  openModal(taskFormHtml(t));
  document.getElementById("taskSave").onclick = async (ev) => {
    const btn = ev.currentTarget;
    const errBox = document.getElementById("taskFormError");
    let body;
    if (userRole === "EMPLOYEE") {
      body = { status: document.getElementById("fStatus").value };
    } else {
      const title = document.getElementById("fTitle").value.trim();
      const proj = document.getElementById("fProj").value;
      if (!title) { errBox.textContent = "Task title is required."; errBox.classList.add("show"); return; }
      if (!proj) { errBox.textContent = "Choose a project for this task."; errBox.classList.add("show"); return; }
      body = { title,
        description: document.getElementById("fDesc").value.trim() || null,
        project_id: +proj,
        assigned_to: document.getElementById("fEmp").value ? +document.getElementById("fEmp").value : null,
        priority: document.getElementById("fPrio").value,
        deadline: document.getElementById("fDue").value || null };
      const st = document.getElementById("fStatus");
      if (st) body.status = st.value;
    }
    setBtnLoading(btn, true);
    const res = t ? await api(`/api/tasks/${t.id}`, { method: "PUT", body })
                  : await api("/api/tasks", { method: "POST", body });
    setBtnLoading(btn, false);
    if (!res.ok) { errBox.textContent = errDetail(res); errBox.classList.add("show"); return; }
    closeModal();
    toast(t ? "Task updated" : "Task created", t ? "Changes saved successfully." : `“${res.data.title}” assigned successfully.`, "success");
    await reload();
  };
}

async function setStatus(id, status) {
  closeAllMenus();
  const res = await api(`/api/tasks/${id}`, { method: "PUT", body: { status } });
  if (!res.ok) { toast("Unable to update task", errDetail(res), "error"); return; }
  toast("Task updated", `Status set to ${friendlyStatus(status)}.`, "success");
  await reload();
}

async function deleteTask(id, title) {
  closeAllMenus();
  const ok = await confirmDialog({ title: "Delete task?",
    message: `Delete “${title}”? This action cannot be undone.` });
  if (!ok) return;
  const res = await api(`/api/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) { toast("Unable to delete task", errDetail(res), "error"); return; }
  toast("Task deleted", `“${title}” was removed.`, "success");
  await reload();
}

async function reload() {
  document.getElementById("rows").innerHTML = skeletonRows(7, 6);
  const reqs = [api("/api/tasks?limit=1000"), api("/api/projects?limit=1000")];
  if (userRole !== "EMPLOYEE") reqs.push(api("/api/employees?limit=1000"));
  const [tasks, projs, emps] = await Promise.all(reqs);
  if (!tasks.ok) {
    document.getElementById("rows").innerHTML = errorState(errDetail(tasks));
    document.getElementById("pager").innerHTML = "";
    return;
  }
  taskAll = tasks.data;
  if (projs.ok) {
    projMap = Object.fromEntries(projs.data.map((p) => [p.id, p.name]));
    document.getElementById("fltProj").innerHTML = `<option value="">All projects</option>` +
      projs.data.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
  }
  if (emps && emps.ok) {
    empMap = Object.fromEntries(emps.data.map((e) => [e.id, e.name]));
    const sel = document.getElementById("fltEmp");
    if (sel) sel.innerHTML = `<option value="">Everyone</option>` +
      emps.data.map((e) => `<option value="${e.id}">${esc(e.name)}</option>`).join("");
  } else {
    const wrap = document.getElementById("assigneeWrap");
    if (wrap) wrap.style.display = "none"; // no backend access → hide, don't invent
  }
  taskPage = 1;
  render();
}

(async () => {
  document.getElementById("rows").innerHTML = skeletonRows(7, 6);
  const user = await initShell();
  if (!user) return;
  userRole = user.role;
  canManage = user.role === "ADMIN" || user.role === "MANAGER";
  applyHeaderSearch();
  document.getElementById("q").addEventListener("input", debounce(() => { taskPage = 1; render(); }, 200));
  ["fltProj", "fltStatus", "fltPrio", "fltEmp"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", () => { taskPage = 1; render(); });
  });
  document.getElementById("perPage").addEventListener("change", (e) => { taskPerPage = +e.target.value; taskPage = 1; render(); });
  taskPerPage = +document.getElementById("perPage").value;
  await reload();
})();
