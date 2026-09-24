/* Dashboard: KPIs, project overview, task summary, recent tasks, profile.
 * Every number comes from the API — no invented statistics. */
"use strict";

function kpiSkeleton() {
  return Array.from({ length: 5 }, () =>
    `<div class="kpi"><div style="flex:1"><div class="skel" style="height:11px;width:60%"></div>` +
    `<div class="skel" style="height:26px;width:40%;margin:8px 0"></div>` +
    `<div class="skel" style="height:11px;width:80%"></div></div></div>`).join("");
}

(async () => {
  // Skeletons paint instantly (before the auth round-trip) so the page
  // never flashes empty cards while the session is being verified.
  document.getElementById("kpis").innerHTML = kpiSkeleton();
  document.getElementById("projRows").innerHTML = skeletonRows(6, 5);
  document.getElementById("taskRows").innerHTML = skeletonRows(6, 5);
  document.getElementById("taskSummary").innerHTML = `<div class="skel" style="height:14px;margin-bottom:10px"></div>`.repeat(3);
  document.getElementById("profileBox").innerHTML = `<div class="skel" style="height:120px"></div>`;

  const user = await initShell();
  if (!user) return;

  document.getElementById("greeting").textContent =
    `${greeting()}, ${user.username} — here’s what’s happening across your organization.`;

  // Parallel fetch. Role-forbidden endpoints are skipped up front (rather
  // than fetched into a 403) so the console stays clean for every role.
  const reqs = [api("/api/dashboard/summary"), api("/api/projects?limit=1000"), api("/api/tasks?limit=1000")];
  if (user.role === "ADMIN") reqs.push(api("/api/users?limit=1000"));
  if (user.role !== "EMPLOYEE") reqs.push(api("/api/employees?limit=1000"));
  const [summary, projects, tasks, users, employees] = await Promise.all(reqs);

  if (!summary.ok) {
    document.getElementById("kpis").innerHTML = "";
    toast("Dashboard unavailable", errDetail(summary), "error");
    document.getElementById("projRows").innerHTML = errorState(errDetail(summary));
    document.getElementById("taskRows").innerHTML = errorState(errDetail(summary));
    return;
  }
  const s = summary.data;
  const projList = projects.ok ? projects.data : [];
  const taskList = tasks.ok ? tasks.data : [];
  const userMap = users && users.ok ? Object.fromEntries(users.data.map((u) => [u.id, u.username])) : {};
  const empMap = employees && employees.ok ? Object.fromEntries(employees.data.map((e) => [e.id, e])) : {};
  const projMap = Object.fromEntries(projList.map((p) => [p.id, p.name]));

  /* ---- KPI cards (all values real) ---- */
  const activeProjects = projList.filter((p) => p.status === "PLANNED" || p.status === "IN_PROGRESS").length;
  const completionRate = s.total_tasks ? Math.round((s.completed_tasks / s.total_tasks) * 100) : 0;
  const kpis = [
    { icon: "users", cls: "navy", label: "Total employees", value: s.total_employees, support: "Active workforce" },
    { icon: "building", cls: "slate", label: "Departments", value: s.total_departments, support: "Organizational units" },
    { icon: "briefcase", cls: "blue", label: "Active projects", value: activeProjects, support: plural(s.total_projects, "project") + " total" },
    { icon: "checksquare", cls: "gold", label: "Total tasks", value: s.total_tasks, support: `${plural(s.pending_tasks, "pending task")} · ${plural(s.in_progress_tasks, "task in progress", "tasks in progress")}` },
    { icon: "chart", cls: "green", label: "Completed", value: s.completed_tasks, support: `${completionRate}% completion rate` },
  ];
  document.getElementById("kpis").innerHTML = kpis.map((k) =>
    `<div class="kpi"><span class="kpi-icon ${k.cls}">${icon(k.icon, 19)}</span>` +
    `<div><small>${k.label}</small><div class="num">${k.value}</div><div class="support">${esc(k.support)}</div></div></div>`).join("");

  /* ---- Task summary: real status distribution ---- */
  const counts = { TODO: 0, IN_PROGRESS: 0, COMPLETED: 0 };
  taskList.forEach((t) => { if (counts[t.status] !== undefined) counts[t.status]++; });
  const total = taskList.length || 1;
  const bar = (label, n, cls) =>
    `<div class="dist-row"><span class="lbl">${label}</span><span class="bar"><span class="${cls}" style="width:${Math.round((n / total) * 100)}%"></span></span><span class="val">${n}</span></div>`;
  document.getElementById("taskSummary").innerHTML =
    bar("To do", counts.TODO, "") + bar("In progress", counts.IN_PROGRESS, "amber") + bar("Completed", counts.COMPLETED, "green") +
    `<p class="cell-sub" style="margin:10px 0 0">${plural(taskList.length, "task")} tracked across ${plural(projList.length, "project")}.</p>`;

  /* ---- Project overview (progress resolved per project) ---- */
  const rows = document.getElementById("projRows");
  if (!projList.length) {
    rows.innerHTML = emptyState({ title: "No projects yet", message: "Create your first project to start tracking delivery.",
      actionLabel: user.role === "EMPLOYEE" ? null : "New project", action: "location.href='projects.html'" });
  } else {
    const shown = projList.slice(0, 8);
    const withProgress = await Promise.all(shown.map(async (p) => {
      const pr = await api(`/api/projects/${p.id}/progress`);
      return { p, pr: pr.ok ? pr.data : null };
    }));
    rows.innerHTML = withProgress.map(({ p, pr }) => {
      const pct = pr ? pr.completion_percentage : 0;
      const done = pr ? `${pr.completed_tasks}/${pr.total_tasks}` : "—";
      return `<tr><td><a href="project.html?id=${p.id}" class="cell-main" style="text-decoration:none;color:inherit">${esc(p.name)}</a></td>` +
        `<td>${esc(userMap[p.manager_id] || "—")}</td><td>${statusBadge(p.status)}</td>` +
        `<td><span class="progress-cell"><span class="progress"><span style="width:${pct}%"></span></span><small>${pct}%</small></span></td>` +
        `<td>${done}</td><td>${fmtDate(p.deadline)}</td></tr>`;
    }).join("");
  }

  /* ---- Recent tasks ---- */
  const trows = document.getElementById("taskRows");
  if (!taskList.length) {
    trows.innerHTML = emptyState({ title: "No tasks yet", message: "Tasks assigned to your team will appear here.",
      actionLabel: user.role === "EMPLOYEE" ? null : "Create task", action: "location.href='tasks.html'" });
  } else {
    trows.innerHTML = taskList.slice(0, 6).map((t) =>
      `<tr><td class="cell-main">${esc(t.title)}</td><td>${esc(projMap[t.project_id] || "—")}</td>` +
      `<td>${esc((empMap[t.assigned_to] || {}).name || "—")}</td>` +
      `<td>${priorityBadge(t.priority)}</td><td>${statusBadge(t.status)}</td><td>${fmtDate(t.deadline)}</td></tr>`).join("");
  }

  /* ---- Profile card (structured — never raw JSON) ---- */
  const mine = employees && employees.ok ? employees.data.find((e) => e.user_id === user.id) : null;
  const deptName = mine && mine.department_id
    ? (await api("/api/departments?limit=1000")).data?.find((d) => d.id === mine.department_id)?.name : null;
  document.getElementById("profileBox").innerHTML =
    `<div class="profile-card"><span class="avatar gold" aria-hidden="true">${esc(initials(user.username))}</span>` +
    `<div><div style="font-size:15px;font-weight:700">${esc(user.username)}</div>` +
    `<div style="margin-top:4px">${roleBadge(user.role)}</div></div></div>` +
    `<dl class="profile-rows">` +
    `<div><dt>Email</dt><dd>${esc(user.email)}</dd></div>` +
    `<div><dt>Department</dt><dd>${esc(deptName || "—")}</dd></div>` +
    (mine ? `<div><dt>Designation</dt><dd>${esc(mine.designation || "—")}</dd></div>` : "") +
    `<div><dt>Account status</dt><dd>${user.is_active ? '<span class="badge b-completed"><span class="dot"></span>Active</span>' : '<span class="badge b-high">Inactive</span>'}</dd></div>` +
    `<div><dt>Member since</dt><dd>${fmtDate(user.created_at)}</dd></div>` +
    `</dl>`;
})();
