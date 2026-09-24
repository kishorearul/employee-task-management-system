/* Project detail: overview facts + progress + project task table. */
"use strict";

const projectId = new URLSearchParams(window.location.search).get("id");
let canManage = false;

async function load() {
  const root = document.getElementById("detailRoot");
  root.innerHTML = `<div class="card card-pad"><div class="skel" style="height:22px;width:35%"></div>` +
    `<div class="skel" style="height:13px;width:60%;margin-top:10px"></div>` +
    `<div class="skel" style="height:90px;margin-top:14px"></div></div>`;
  const reqs = [api(`/api/projects/${projectId}`), api(`/api/projects/${projectId}/progress`),
    api(`/api/tasks?project_id=${projectId}&limit=1000`)];
  if (window._role === "ADMIN") reqs.push(api("/api/users?limit=1000"));
  if (window._role !== "EMPLOYEE") reqs.push(api("/api/employees?limit=1000"));
  const [proj, prog, taskRes, users, emps] = await Promise.all(reqs);
  if (!proj.ok) {
    root.innerHTML = `<div class="card"><div class="state-block">` +
      `<span class="s-icon">${icon("alert", 22)}</span><h3>Project not found</h3>` +
      `<p>${esc(errDetail(proj))}</p><a class="btn btn-secondary btn-sm" href="projects.html">Back to projects</a></div></div>`;
    return;
  }
  const p = proj.data;
  document.getElementById("crumbName").textContent = p.name;
  document.title = `${p.name} — ETMS`;
  const pr = prog.ok ? prog.data : { total_tasks: 0, completed_tasks: 0, completion_percentage: 0 };
  const mgr = users && users.ok ? (users.data.find((u) => u.id === p.manager_id) || {}).username : null;
  const empMap = emps && emps.ok ? Object.fromEntries(emps.data.map((e) => [e.id, e.name])) : {};
  const tasks = taskRes.ok ? taskRes.data : [];

  root.innerHTML =
    `<div class="page-head"><div><h1>${esc(p.name)}</h1>` +
    `<p class="sub">${esc(p.description || "No description provided.")}</p></div>` +
    `<div class="actions">${statusBadge(p.status)}` +
    (canManage ? `<button class="btn btn-secondary btn-sm" onclick="editProject()">${icon("pencil", 14)} Edit</button>` +
      `<button class="btn btn-danger-outline btn-sm" onclick="removeProject()">${icon("trash", 14)} Delete</button>` : "") +
    `</div></div>` +
    `<section class="card" aria-label="Project overview"><div class="card-head"><h2>Project overview</h2></div>` +
    `<div class="card-pad"><dl class="profile-rows cols-3">` +
    `<div><dt>Manager</dt><dd>${esc(mgr || "—")}</dd></div>` +
    `<div><dt>Start date</dt><dd>${fmtDate(p.start_date)}</dd></div>` +
    `<div><dt>Deadline</dt><dd>${fmtDate(p.deadline)}</dd></div>` +
    `<div><dt>Total tasks</dt><dd>${pr.total_tasks}</dd></div>` +
    `<div><dt>Completed</dt><dd>${pr.completed_tasks}</dd></div>` +
    `<div><dt>Completion</dt><dd>${pr.completion_percentage}%</dd></div>` +
    `</dl><div class="progress" style="margin-top:14px;height:9px"><span style="width:${pr.completion_percentage}%"></span></div>` +
    `</div></section>` +
    `<section class="card" aria-label="Project tasks"><div class="card-head"><h2>Tasks</h2>` +
    `<span class="hint"><a href="tasks.html">Manage in Tasks</a></span></div>` +
    `<div class="table-wrap"><table class="data"><thead><tr><th>Task</th><th>Assigned to</th><th>Priority</th><th>Status</th><th>Due</th></tr></thead>` +
    `<tbody>` + (tasks.length ? tasks.map((t) =>
      `<tr><td class="cell-main">${esc(t.title)}</td><td>${esc(empMap[t.assigned_to] || "—")}</td>` +
      `<td>${priorityBadge(t.priority)}</td><td>${statusBadge(t.status)}</td><td>${fmtDate(t.deadline)}</td></tr>`).join("")
      : `<tr><td colspan="5"><div class="state-block"><span class="s-icon">${icon("inbox", 22)}</span>` +
        `<h3>No tasks in this project</h3><p>Work items created for this project will appear here.</p></div></td></tr>`) +
    `</tbody></table></div></section>`;

  window._project = p;
}

async function editProject() {
  const p = window._project;
  const st = ["PLANNED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"].map((s) =>
    `<option value="${s}"${p.status === s ? " selected" : ""}>${friendlyStatus(s)}</option>`).join("");
  openModal(modalHead("Edit project", p.name) +
    `<div class="modal-body">` +
    `<div class="f-field"><label class="f-label" for="eName">Project name *</label><input class="f-input" id="eName" value="${esc(p.name)}"></div>` +
    `<div class="f-field"><label class="f-label" for="eDesc">Description</label><textarea class="f-input" id="eDesc">${esc(p.description || "")}</textarea></div>` +
    `<div class="f-row"><div class="f-field"><label class="f-label" for="eStart">Start date</label><input class="f-input" id="eStart" type="date" value="${esc(p.start_date || "")}"></div>` +
    `<div class="f-field"><label class="f-label" for="eEnd">Deadline</label><input class="f-input" id="eEnd" type="date" value="${esc(p.deadline || "")}"></div></div>` +
    `<div class="f-field"><label class="f-label" for="eStatus">Status</label><select class="f-input" id="eStatus">${st}</select></div>` +
    `<div class="f-error" id="eErr" role="alert"></div></div>` +
    `<div class="modal-foot"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button>` +
    `<button class="btn btn-primary" id="eSave">Save changes</button></div>`);
  document.getElementById("eSave").onclick = async (ev) => {
    const btn = ev.currentTarget;
    const name = document.getElementById("eName").value.trim();
    const start = document.getElementById("eStart").value || null;
    const deadline = document.getElementById("eEnd").value || null;
    const errBox = document.getElementById("eErr");
    if (!name) { errBox.textContent = "Project name is required."; errBox.classList.add("show"); return; }
    if (start && deadline && deadline < start) { errBox.textContent = "Deadline must not be earlier than the start date."; errBox.classList.add("show"); return; }
    setBtnLoading(btn, true);
    const res = await api(`/api/projects/${p.id}`, { method: "PUT", body: {
      name, description: document.getElementById("eDesc").value.trim() || null,
      start_date: start, deadline, status: document.getElementById("eStatus").value } });
    setBtnLoading(btn, false);
    if (!res.ok) { errBox.textContent = errDetail(res); errBox.classList.add("show"); return; }
    closeModal();
    toast("Project updated", "Changes saved successfully.", "success");
    load();
  };
}

async function removeProject() {
  const p = window._project;
  const ok = await confirmDialog({ title: "Delete project?",
    message: `Delete ${p.name} and all of its tasks? This action cannot be undone.` });
  if (!ok) return;
  const res = await api(`/api/projects/${p.id}`, { method: "DELETE" });
  if (!res.ok) { toast("Unable to delete project", errDetail(res), "error"); return; }
  toast("Project deleted", `${p.name} was removed.`, "success");
  window.location.href = "projects.html";
}

(async () => {
  if (!projectId) { window.location.href = "projects.html"; return; }
  document.getElementById("detailRoot").innerHTML =
    `<div class="card card-pad"><div class="skel" style="height:22px;width:35%"></div>` +
    `<div class="skel" style="height:13px;width:60%;margin-top:10px"></div>` +
    `<div class="skel" style="height:90px;margin-top:14px"></div></div>`;
  const user = await initShell();
  if (!user) return;
  window._role = user.role;
  canManage = user.role === "ADMIN" || user.role === "MANAGER";
  await load();
})();
