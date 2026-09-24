/* Employees: search + department filter + pagination (client-side over one
 * bounded snapshot), view / create / edit modals, confirm-to-delete. */
"use strict";

let empAll = [];
let deptMap = {};
let empPage = 1;
let empPerPage = 10;
let canEdit = false;

document.getElementById("addIc").innerHTML = icon("plus", 16);

function filtered() {
  const q = document.getElementById("q").value.trim().toLowerCase();
  const dep = document.getElementById("fltDept").value;
  return empAll.filter((e) => {
    if (dep && String(e.department_id || "") !== dep) return false;
    if (!q) return true;
    return [e.name, e.email, e.designation].some((v) => (v || "").toLowerCase().includes(q));
  });
}

function render() {
  const rows = document.getElementById("rows");
  const list = filtered();
  const { rows: pageRows, page, pages, total } = paginate(list, empPage, empPerPage);
  empPage = page;
  if (!total) {
    rows.innerHTML = emptyState({ title: "No employees found",
      message: list.length || empAll.length ? "Try adjusting your search or filters."
        : "Add your first team member to build the directory.",
      actionLabel: canEdit && !empAll.length ? "Add employee" : null, action: "openEmployeeModal()" });
  } else {
    rows.innerHTML = pageRows.map((e, i) =>
      `<tr><td><div style="display:flex;align-items:center;gap:10px">` +
      `<span class="avatar" style="width:32px;height:32px;font-size:11.5px;background:var(--color-surface-2);color:var(--color-navy-900);border:1px solid var(--color-border)">${esc(initials(e.name))}</span>` +
      `<span><span class="cell-main">${esc(e.name)}</span><br><span class="cell-sub">${esc(e.email)}</span></span></div></td>` +
      `<td>${esc(deptMap[e.department_id] || "—")}</td>` +
      `<td>${esc(e.designation || "—")}</td><td>${esc(e.phone || "—")}</td>` +
      `<td>${fmtDate(e.joining_date || e.created_at)}</td>` +
      (canEdit
        ? `<td><div class="menu-anchor"><button class="icon-btn" style="color:var(--color-muted)" onclick="toggleMenu('m${e.id}',event)" aria-label="Actions for ${esc(e.name)}" aria-haspopup="true" aria-expanded="false">${icon("dots", 17)}</button>` +
          `<div class="menu" id="m${e.id}" role="menu">` +
          `<button onclick="viewEmployee(${e.id})" role="menuitem">${icon("eye", 15)} View</button>` +
          `<button onclick="openEmployeeModal(${e.id})" role="menuitem">${icon("pencil", 15)} Edit</button>` +
          `<button class="danger-item" onclick="deleteEmployee(${e.id},'${esc(e.name).replace(/'/g, "\\'")}')" role="menuitem">${icon("trash", 15)} Delete</button>` +
          `</div></div></td>`
        : `<td></td>`)).join("");
  }
  document.getElementById("pager").innerHTML = pagerHtml("emp", page, pages, total, empPerPage);
}
function empGoto(p) { empPage = p; render(); }

function employeeFormHtml(e) {
  const deptOpts = `<option value="">— No department —</option>` +
    Object.entries(deptMap).map(([id, n]) =>
      `<option value="${id}"${e && String(e.department_id) === String(id) ? " selected" : ""}>${esc(n)}</option>`).join("");
  return modalHead(e ? "Edit employee" : "Add employee", e ? e.name : "New team member record") +
    `<div class="modal-body"><form id="empForm" novalidate>` +
    `<div class="f-row"><div class="f-field"><label class="f-label" for="fName">Full name *</label>` +
    `<input class="f-input" id="fName" value="${esc(e?.name || "")}" placeholder="e.g. Alice Smith" required></div>` +
    `<div class="f-field"><label class="f-label" for="fEmail">Work email *</label>` +
    `<input class="f-input" id="fEmail" type="email" value="${esc(e?.email || "")}" placeholder="alice@company.com" required></div></div>` +
    `<div class="f-row"><div class="f-field"><label class="f-label" for="fDesig">Designation</label>` +
    `<input class="f-input" id="fDesig" value="${esc(e?.designation || "")}" placeholder="e.g. Senior Developer"></div>` +
    `<div class="f-field"><label class="f-label" for="fPhone">Phone</label>` +
    `<input class="f-input" id="fPhone" value="${esc(e?.phone || "")}" placeholder="+1 555 0100"></div></div>` +
    `<div class="f-row"><div class="f-field"><label class="f-label" for="fDept">Department</label>` +
    `<select class="f-input" id="fDept">${deptOpts}</select></div>` +
    `<div class="f-field"><label class="f-label" for="fJoin">Joining date</label>` +
    `<input class="f-input" id="fJoin" type="date" value="${esc(e?.joining_date || "")}"></div></div>` +
    `<div class="f-error" id="empFormError" role="alert"></div>` +
    `</form></div><div class="modal-foot">` +
    `<button class="btn btn-secondary" onclick="closeModal()">Cancel</button>` +
    `<button class="btn btn-primary" id="empSave">${e ? "Save changes" : "Add employee"}</button></div>`;
}

async function openEmployeeModal(id) {
  const e = id ? empAll.find((x) => x.id === id) : null;
  openModal(employeeFormHtml(e));
  document.getElementById("empSave").onclick = async (ev) => {
    const btn = ev.currentTarget;
    const name = document.getElementById("fName").value.trim();
    const email = document.getElementById("fEmail").value.trim();
    const errBox = document.getElementById("empFormError");
    if (!name || !email) { errBox.textContent = "Name and email are required."; errBox.classList.add("show"); return; }
    setBtnLoading(btn, true);
    const body = { name, email,
      designation: document.getElementById("fDesig").value.trim() || null,
      phone: document.getElementById("fPhone").value.trim() || null,
      department_id: document.getElementById("fDept").value ? +document.getElementById("fDept").value : null,
      joining_date: document.getElementById("fJoin").value || null };
    const res = e ? await api(`/api/employees/${e.id}`, { method: "PUT", body })
                  : await api("/api/employees", { method: "POST", body });
    setBtnLoading(btn, false);
    if (!res.ok) { errBox.textContent = errDetail(res); errBox.classList.add("show"); return; }
    closeModal();
    toast(e ? "Employee updated" : "Employee added", `${res.data.name} saved successfully.`, "success");
    await reload();
  };
}

async function viewEmployee(id) {
  closeAllMenus();
  const e = empAll.find((x) => x.id === id);
  if (!e) return;
  openModal(modalHead(e.name, e.designation || "Employee record") +
    `<div class="modal-body"><dl class="readonly-grid">` +
    `<dt>Email</dt><dd>${esc(e.email)}</dd>` +
    `<dt>Phone</dt><dd>${esc(e.phone || "—")}</dd>` +
    `<dt>Department</dt><dd>${esc(deptMap[e.department_id] || "—")}</dd>` +
    `<dt>Joined</dt><dd>${fmtDate(e.joining_date || e.created_at)}</dd></dl>` +
    `<h4 style="margin:16px 0 8px;font-size:13px">Assigned tasks</h4><div id="empTasks"><div class="skel" style="height:14px"></div></div>` +
    `</div><div class="modal-foot"><button class="btn btn-secondary" onclick="closeModal()">Close</button>` +
    (canEdit ? `<button class="btn btn-primary" onclick="closeModal();openEmployeeModal(${e.id})">Edit</button>` : "") + `</div>`);
  const t = await api(`/api/tasks?assigned_to=${e.id}&limit=100`);
  document.getElementById("empTasks").innerHTML = !t.ok
    ? `<p class="cell-sub">${esc(errDetail(t))}</p>`
    : t.data.length
      ? `<table class="data" style="min-width:0"><tbody>` + t.data.map((x) =>
        `<tr><td class="cell-main">${esc(x.title)}</td><td>${statusBadge(x.status)}</td></tr>`).join("") + `</tbody></table>`
      : `<p class="cell-sub">No tasks assigned.</p>`;
}

async function deleteEmployee(id, name) {
  closeAllMenus();
  const ok = await confirmDialog({ title: "Delete employee?",
    message: `Remove ${name} from the directory? Assigned tasks will become unassigned. This action cannot be undone.` });
  if (!ok) return;
  const res = await api(`/api/employees/${id}`, { method: "DELETE" });
  if (!res.ok) { toast("Unable to delete employee", errDetail(res), "error"); return; }
  toast("Employee deleted", `${name} was removed.`, "success");
  await reload();
}

async function reload() {
  document.getElementById("rows").innerHTML = skeletonRows(6, 6);
  const [emps, deps] = await Promise.all([api("/api/employees?limit=1000"), api("/api/departments?limit=1000")]);
  if (!emps.ok) {
    document.getElementById("rows").innerHTML = errorState(errDetail(emps));
    document.getElementById("pager").innerHTML = "";
    return;
  }
  empAll = emps.data;
  if (deps.ok) {
    deptMap = Object.fromEntries(deps.data.map((d) => [d.id, d.name]));
    document.getElementById("fltDept").innerHTML = `<option value="">All departments</option>` +
      deps.data.map((d) => `<option value="${d.id}">${esc(d.name)}</option>`).join("");
  }
  empPage = 1;
  render();
}

(async () => {
  document.getElementById("rows").innerHTML = skeletonRows(6, 6);
  // initShell gates EMPLOYEE role out (server forbids listing) with an explanation.
  const user = await initShell({ requires: ["ADMIN", "MANAGER"] });
  if (!user) return;
  canEdit = user.role === "ADMIN"; // managers view; only admins mutate (server rule)
  document.getElementById("q").addEventListener("input", debounce(() => { empPage = 1; render(); }, 200));
  document.getElementById("fltDept").addEventListener("change", () => { empPage = 1; render(); });
  document.getElementById("perPage").addEventListener("change", (e) => { empPerPage = +e.target.value; empPage = 1; render(); });
  empPerPage = +document.getElementById("perPage").value;
  await reload();
})();
