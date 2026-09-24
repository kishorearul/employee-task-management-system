/* Departments as cards: name, description, real staff count, actions. */
"use strict";

let deptAll = [];
let staffCounts = null; // null when role may not list employees (counts hidden)
let canEdit = false;
let userRole = "EMPLOYEE";

document.getElementById("addIc").innerHTML = icon("plus", 16);

function render() {
  const grid = document.getElementById("deptGrid");
  if (!deptAll.length) {
    grid.innerHTML = `<div class="card" style="grid-column:1/-1"><div class="state-block">` +
      `<span class="s-icon">${icon("building", 22)}</span><h3>No departments yet</h3>` +
      `<p>Create your first department to start organizing teams.</p>` +
      (canEdit ? `<button class="btn btn-primary btn-sm" onclick="openDepartmentModal()">${icon("plus", 15)} New department</button>` : "") +
      `</div></div>`;
    return;
  }
  grid.innerHTML = deptAll.map((d) =>
    `<article class="dept-card"><h3>${esc(d.name)}</h3>` +
    `<p class="desc">${esc(d.description || "No description.")}</p>` +
    `<div class="dept-meta">` +
    (staffCounts !== null ? `<span><strong>${staffCounts[d.id] || 0}</strong> staff</span>` : "") +
    `<span>Created ${fmtDate(d.created_at)}</span></div>` +
    (canEdit
      ? `<div class="dept-foot"><div class="menu-anchor">` +
        `<button class="icon-btn" style="color:var(--color-muted)" onclick="toggleMenu('md${d.id}',event)" aria-label="Actions for ${esc(d.name)}" aria-haspopup="true" aria-expanded="false">${icon("dots", 17)}</button>` +
        `<div class="menu" id="md${d.id}" role="menu">` +
        `<button onclick="openDepartmentModal(${d.id})" role="menuitem">${icon("pencil", 15)} Edit</button>` +
        `<button class="danger-item" onclick="deleteDepartment(${d.id},'${esc(d.name).replace(/'/g, "\\'")}')" role="menuitem">${icon("trash", 15)} Delete</button>` +
        `</div></div></div>`
      : "") +
    `</article>`).join("");
}

function departmentFormHtml(d) {
  return modalHead(d ? "Edit department" : "New department", d ? d.name : "Create an organizational unit") +
    `<div class="modal-body"><form id="depForm" novalidate>` +
    `<div class="f-field"><label class="f-label" for="fName">Department name *</label>` +
    `<input class="f-input" id="fName" value="${esc(d?.name || "")}" placeholder="e.g. Engineering" required>` +
    `<div class="f-help">Names must be unique across the organization.</div></div>` +
    `<div class="f-field"><label class="f-label" for="fDesc">Description</label>` +
    `<textarea class="f-input" id="fDesc" placeholder="What this team is responsible for…">${esc(d?.description || "")}</textarea></div>` +
    `<div class="f-error" id="depFormError" role="alert"></div>` +
    `</form></div><div class="modal-foot">` +
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>` +
    `<button class="btn btn-primary" id="depSave">${d ? "Save changes" : "Create department"}</button></div>`;
}

async function openDepartmentModal(id) {
  const d = id ? deptAll.find((x) => x.id === id) : null;
  if (id) closeAllMenus();
  openModal(departmentFormHtml(d));
  document.getElementById("depSave").onclick = async (ev) => {
    const btn = ev.currentTarget;
    const name = document.getElementById("fName").value.trim();
    const errBox = document.getElementById("depFormError");
    if (!name) { errBox.textContent = "Department name is required."; errBox.classList.add("show"); return; }
    setBtnLoading(btn, true);
    const body = { name, description: document.getElementById("fDesc").value.trim() || null };
    const res = d ? await api(`/api/departments/${d.id}`, { method: "PUT", body })
                  : await api("/api/departments", { method: "POST", body });
    setBtnLoading(btn, false);
    if (!res.ok) { errBox.textContent = errDetail(res); errBox.classList.add("show"); return; }
    closeModal();
    toast(d ? "Department updated" : "Department created", `${res.data.name} saved successfully.`, "success");
    await reload();
  };
}

async function deleteDepartment(id, name) {
  closeAllMenus();
  const ok = await confirmDialog({ title: "Delete department?",
    message: `Remove ${name}? Staff records are kept but will no longer belong to a department. This action cannot be undone.` });
  if (!ok) return;
  const res = await api(`/api/departments/${id}`, { method: "DELETE" });
  if (!res.ok) { toast("Unable to delete department", errDetail(res), "error"); return; }
  toast("Department deleted", `${name} was removed.`, "success");
  await reload();
}

async function reload() {
  document.getElementById("deptGrid").innerHTML =
    Array.from({ length: 3 }, () => `<div class="card card-pad"><div class="skel" style="height:16px;width:50%"></div><div class="skel" style="height:12px;width:80%;margin-top:10px"></div><div class="skel" style="height:12px;width:40%;margin-top:8px"></div></div>`).join("");
  const reqs = [api("/api/departments?limit=1000")];
  if (userRole !== "EMPLOYEE") reqs.push(api("/api/employees?limit=1000"));
  const [deps, emps] = await Promise.all(reqs);
  if (!deps.ok) {
    document.getElementById("deptGrid").innerHTML =
      `<div class="card" style="grid-column:1/-1"><div class="state-block">` +
      `<span class="s-icon">${icon("alert", 22)}</span><h3>Unable to load departments</h3>` +
      `<p>${esc(errDetail(deps))}</p><button class="btn btn-secondary btn-sm" onclick="location.reload()">Retry</button></div></div>`;
    return;
  }
  deptAll = deps.data;
  if (emps && emps.ok) {
    staffCounts = {};
    emps.data.forEach((e) => { if (e.department_id) staffCounts[e.department_id] = (staffCounts[e.department_id] || 0) + 1; });
  } else {
    staffCounts = null; // e.g. EMPLOYEE role: counts stay hidden rather than invented
  }
  render();
}

(async () => {
  document.getElementById("deptGrid").innerHTML =
    Array.from({ length: 3 }, () => `<div class="card card-pad"><div class="skel" style="height:16px;width:50%"></div><div class="skel" style="height:12px;width:80%;margin-top:10px"></div><div class="skel" style="height:12px;width:40%;margin-top:8px"></div></div>`).join("");
  const user = await initShell();
  if (!user) return;
  userRole = user.role;
  canEdit = user.role === "ADMIN";
  await reload();
})();
