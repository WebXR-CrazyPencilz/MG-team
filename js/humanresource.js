// ═══════════════════════════════════════════════════
// HUMANRESOURCE.JS — HR Portal shell
// Tabs: Attendance | Project Contribution | Add Employee
//
// Same "this file is only a loading/navigation platform" convention
// as manager.js/teamleader.js:
//   Attendance          → client-project.js (renderAttendanceTab) —
//                          the exact same widget Manager/TL use, no
//                          second implementation. CP_ROLE === 'hr' is
//                          read-only there since the Manager/TL-only
//                          edit buttons all gate on isManager/CP_ROLE
//                          === 'tl' specifically.
//   Project Contribution → this file, built straight from CP_TIMESHEET_DATA
//                          + CP_EMPLOYEES (same data Attendance already
//                          loads) — no new fetch, no financial figures
//                          (₹ cost/constant intentionally never shown
//                          here, this is a hours/contribution view only).
//   Add Employee         → this file, calls a new 'createEmployee'
//                          backend action (see note at bottom of this
//                          file — Code.gs needs this action added).
//
// Desktop-only layout, matching manager.js/teamleader.js.
// ═══════════════════════════════════════════════════

// ── STATE ─────────────────────────────────────────
let HR_DATA      = [];
let HR_EMPLOYEES = [];
let HR_TAB       = 'dashboard'; // dashboard|attendance|contribution|addEmployee — Dashboard is the default landing tab

// ── INIT ──────────────────────────────────────────
async function initHR() {
  const container = $('hrApp');
  if (!container) return;

  container.innerHTML = `<div class="mgr-loading">
    <div class="slot-spinner"></div>
    <span>Loading all data…</span>
  </div>`;

  try {
    // Reuses the master data auth.js ALREADY fetched once during
    // login (LIVE_EMPLOYEES/CLIENTS/PROJECTS) instead of calling
    // apiGetMasterData() again from scratch — same reasoning as
    // manager.js's/teamleader.js's identical fix: one fewer redundant
    // round-trip, one fewer chance to fail on a flaky connection.
    // Falls back to a real fetch only if those globals are somehow
    // still empty.
    const master = (typeof LIVE_EMPLOYEES !== 'undefined' && LIVE_EMPLOYEES.length)
      ? { employees: LIVE_EMPLOYEES, clients: (typeof CLIENTS !== 'undefined' ? CLIENTS : []), projects: (typeof PROJECTS !== 'undefined' ? PROJECTS : []) }
      : await apiGetMasterData();
    HR_EMPLOYEES = master.employees || [];

    if (typeof ClientProjectAPI !== 'undefined' && typeof ClientProjectAPI.ingestMasterData === 'function') {
      ClientProjectAPI.ingestMasterData(master);
    }

    // Each employee's history is fetched independently and tagged
    // with whether it actually succeeded — NOT silently swallowed to
    // an empty array on failure. See teamleader.js's identical fix
    // for the full reasoning: a single flaky request out of up to 19
    // firing in parallel used to make that employee's real timesheet
    // data vanish everywhere with no warning at all — indistinguishable
    // from them genuinely having no entries.
    const results = await Promise.all(
      HR_EMPLOYEES.map(emp =>
        apiGetAllHistory(emp.id)
          .then(entries => ({ ok: true, empName: emp.name, entries: entries.map(e => ({ ...e, empId: emp.id, empName: emp.name, empTeam: emp.team })) }))
          .catch(err => ({ ok: false, empName: emp.name, error: err.message, entries: [] }))
      )
    );
    const failed = results.filter(r => !r.ok);
    HR_DATA = results.flatMap(r => r.entries);

    if (failed.length) {
      toast?.('e', `Couldn't load ${failed.length} employee${failed.length > 1 ? "s'" : "'s"} timesheet data`,
        `${failed.map(f => f.empName).join(', ')} — their hours may show as missing below. Reload to retry.`, 12000);
    }

    if (typeof ClientProjectAPI !== 'undefined' && typeof ClientProjectAPI.ingestTimesheetData === 'function') {
      ClientProjectAPI.ingestTimesheetData(HR_DATA);
    }

    renderHRPortal();
  } catch(err) {
    container.innerHTML = `<div class="slot-error">Failed to load: ${err.message}</div>`;
  }
}

// ── RENDER PORTAL SHELL ───────────────────────────
function renderHRPortal() {
  const container = $('hrApp');
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex;gap:4px;margin-bottom:1.5rem;border-bottom:1px solid var(--border);padding-bottom:0;">
      ${[
        { id:'dashboard',    icon:'🏠', label:'Dashboard' },
        { id:'project',      icon:'📁', label:'Projects & Clients' },
        { id:'attendance',   icon:'🕒', label:'Attendance' },
        { id:'contribution', icon:'📊', label:'Project Contribution' },
        { id:'addEmployee',  icon:'➕', label:'Add Employee' },
        { id:'manageEmployees', icon:'✏️', label:'Manage Employees' },
      ].map(t => `
        <button class="hr-tab${HR_TAB===t.id?' active':''}" data-tab="${t.id}" style="
          padding:8px 16px;border:none;background:none;cursor:pointer;
          font-size:13px;font-weight:600;
          color:${HR_TAB===t.id ? 'var(--a1)' : 'var(--txt2)'};
          border-bottom:2px solid ${HR_TAB===t.id ? 'var(--a1)' : 'transparent'};
          margin-bottom:-1px;transition:all .2s;
        ">${t.icon} ${t.label}</button>
      `).join('')}
    </div>
    <div id="hrTabContent"></div>
  `;

  container.querySelectorAll('.hr-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      HR_TAB = btn.dataset.tab;
      container.querySelectorAll('.hr-tab').forEach(b => {
        const active = b === btn;
        b.style.color        = active ? 'var(--a1)' : 'var(--txt2)';
        b.style.borderBottom = active ? '2px solid var(--a1)' : '2px solid transparent';
      });
      renderHRTab();
    });
  });

  renderHRTab();
}

// ── ROUTE TO TAB ──────────────────────────────────
function renderHRTab() {
  const content = $('hrTabContent');
  if (!content) return;

  if (HR_TAB === 'dashboard') {
    // Reuses the Manager Dashboard wholesale (dashboard.js) instead of
    // HR's old standalone implementation — same structure/cards/charts
    // as Manager, gated for HR only by dashboard.js's own MANAGER_MODE
    // || HR_MODE check (see that file). Manager-only financial widgets
    // inside it stay Manager-only via that same permission check, not
    // by HR getting a different/hidden copy of this module.
    if (typeof renderManagerDashboard === 'function') renderManagerDashboard(content);
    else content.innerHTML = `<div class="chart-empty">Dashboard module (dashboard.js) is not loaded.</div>`;
    return;
  }
  if (HR_TAB === 'project') {
    if (typeof renderProjectTab === 'function') renderProjectTab(content);
    else content.innerHTML = `<div class="chart-empty">Project module (client-project.js) is not loaded.</div>`;
    return;
  }
  if (HR_TAB === 'attendance') {
    if (typeof renderAttendanceTab === 'function') renderAttendanceTab(content);
    else content.innerHTML = `<div class="chart-empty">Attendance module (client-project.js) is not loaded.</div>`;
    return;
  }
  if (HR_TAB === 'contribution') { renderHRContributionTab(content); return; }
  if (HR_TAB === 'addEmployee')  { renderHRAddEmployeeTab(content);  return; }
  if (HR_TAB === 'manageEmployees') { renderHRManageEmployeesTab(content); return; }
}

// ══════════════════════════════════════════════════
// PROJECT CONTRIBUTION — per employee, hours spent per project.
// Built straight from CP_TIMESHEET_DATA (already loaded for
// Attendance above) + CP_EMPLOYEES — no financial figures, no new
// fetch. Search + sort, expand a row to see that employee's
// project-by-project hours breakdown (most-hours-first).
// ══════════════════════════════════════════════════
let HR_CONTRIB_SEARCH   = '';
let HR_CONTRIB_SORT     = 'hours'; // 'hours' | 'name'
let HR_CONTRIB_EXPANDED = new Set();

function buildHRContributionRows() {
  const employees = (typeof CP_EMPLOYEES !== 'undefined' ? CP_EMPLOYEES : HR_EMPLOYEES);
  const entries    = (typeof CP_TIMESHEET_DATA !== 'undefined' ? CP_TIMESHEET_DATA : HR_DATA)
    .filter(e => e.status !== 'Leave' && e.project);

  return employees.map(emp => {
    const empEntries = entries.filter(e => e.empId === emp.id);
    const byProject = {};
    empEntries.forEach(e => {
      byProject[e.project] = (byProject[e.project] || 0) + (parseFloat(e.hours) || 0);
    });
    const projects = Object.entries(byProject)
      .map(([project, hours]) => ({ project, hours }))
      .sort((a, b) => b.hours - a.hours);
    const totalHours = projects.reduce((s, p) => s + p.hours, 0);
    return { emp, projects, totalHours };
  });
}

function renderHRContributionTab(content) {
  content.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.1rem;flex-wrap:wrap;gap:10px;">
      <div>
        <div style="font-size:16px;font-weight:700;color:var(--txt1);">📊 Project Contribution</div>
        <div style="font-size:12px;color:var(--txt2);">Hours each employee has logged, broken down by project.</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <input id="hrContribSearch" type="text" placeholder="🔍 Search employee…" value="${esc(HR_CONTRIB_SEARCH)}" style="
          background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--txt1);
          font-size:12px;padding:6px 10px;min-width:200px;"/>
        <div class="chart-range" id="hrContribSortBtns">
          <button class="rbtn${HR_CONTRIB_SORT==='hours'?' active':''}" data-sort="hours">Most Hours</button>
          <button class="rbtn${HR_CONTRIB_SORT==='name'?' active':''}" data-sort="name">Name A→Z</button>
        </div>
      </div>
    </div>
    <div id="hrContribList"></div>
  `;

  $('hrContribSearch').addEventListener('input', e => {
    HR_CONTRIB_SEARCH = e.target.value;
    renderHRContribList();
  });
  $('hrContribSortBtns').addEventListener('click', e => {
    const btn = e.target.closest('.rbtn');
    if (!btn) return;
    HR_CONTRIB_SORT = btn.dataset.sort;
    $('hrContribSortBtns').querySelectorAll('.rbtn').forEach(b => b.classList.toggle('active', b === btn));
    renderHRContribList();
  });

  renderHRContribList();
}

function renderHRContribList() {
  const listEl = $('hrContribList');
  if (!listEl) return;

  let rows = buildHRContributionRows();
  const q = HR_CONTRIB_SEARCH.trim().toLowerCase();
  if (q) rows = rows.filter(r => (r.emp.name || '').toLowerCase().includes(q) || (r.emp.id || '').toLowerCase().includes(q));

  rows.sort((a, b) => HR_CONTRIB_SORT === 'name'
    ? (a.emp.name || '').localeCompare(b.emp.name || '')
    : b.totalHours - a.totalHours);

  if (!rows.length) {
    listEl.innerHTML = `<div class="chart-empty">No employees match.</div>`;
    return;
  }

  listEl.innerHTML = `
    <div style="background:var(--surface1);border:1px solid var(--border);border-radius:12px;overflow:hidden;">
      ${rows.map((r, i) => {
        const expanded = HR_CONTRIB_EXPANDED.has(r.emp.id);
        return `
        <div class="hr-contrib-row" data-emp="${esc(r.emp.id)}" style="${i > 0 ? 'border-top:1px solid var(--border);' : ''}">
          <div class="hr-contrib-head" data-emp="${esc(r.emp.id)}" style="padding:12px 16px;cursor:pointer;
            display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:10px;">
              <span style="font-size:12px;color:var(--txt2);width:14px;display:inline-block;">${expanded ? '▾' : '▸'}</span>
              <div>
                <div style="font-size:13px;font-weight:700;color:var(--txt1);">${esc(r.emp.name)}</div>
                <div style="font-size:10.5px;color:var(--txt2);">${esc(r.emp.id)} · ${esc(r.emp.team || '—')}</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:16px;">
              <div style="font-size:10.5px;color:var(--txt2);">${r.projects.length} project${r.projects.length===1?'':'s'}</div>
              <div style="font-size:13px;font-weight:700;color:var(--a1);">${fh(r.totalHours)}</div>
            </div>
          </div>
          ${expanded ? `
            <div style="padding:0 16px 14px 40px;">
              ${r.projects.length ? r.projects.map(p => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-top:1px solid var(--border);">
                  <div style="font-size:12px;color:var(--txt1);">${esc(p.project)}</div>
                  <div style="font-size:12px;font-weight:600;color:var(--txt1);">${fh(p.hours)}</div>
                </div>`).join('') : `<div style="font-size:11.5px;color:var(--txt2);padding:6px 0;">No project hours logged yet.</div>`}
            </div>` : ''}
        </div>`;
      }).join('')}
    </div>`;

  listEl.querySelectorAll('.hr-contrib-head').forEach(head => {
    head.addEventListener('click', () => {
      const id = head.dataset.emp;
      if (HR_CONTRIB_EXPANDED.has(id)) HR_CONTRIB_EXPANDED.delete(id);
      else HR_CONTRIB_EXPANDED.add(id);
      renderHRContribList();
    });
  });
}

// ══════════════════════════════════════════════════
// ADD EMPLOYEE — new employee creation form.
//
// ⚠️ BACKEND REQUIRED: this calls a 'createEmployee' action that
// does not exist in Code.gs yet. See the comment block at the very
// end of this file for the exact Apps Script function to add.
// ══════════════════════════════════════════════════
function nextHREmployeeId() {
  const employees = (typeof CP_EMPLOYEES !== 'undefined' ? CP_EMPLOYEES : HR_EMPLOYEES);
  const nums = employees
    .map(e => (String(e.id || '').match(/^E(\d+)$/) || [])[1])
    .filter(Boolean)
    .map(Number);
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return 'E' + String(next).padStart(2, '0');
}

function renderHRAddEmployeeTab(content) {
  const suggestedId = nextHREmployeeId();
  const teams = [...new Set((typeof CP_EMPLOYEES !== 'undefined' ? CP_EMPLOYEES : HR_EMPLOYEES).map(e => e.team).filter(Boolean))].sort();

  content.innerHTML = `
    <div style="max-width:480px;">
      <div style="font-size:16px;font-weight:700;color:var(--txt1);margin-bottom:2px;">➕ Add Employee</div>
      <div style="font-size:12px;color:var(--txt2);margin-bottom:1.1rem;">Creates a new employee record and login for the timesheet portal.</div>

      <form id="hrAddEmpForm" style="background:var(--surface1);border:1px solid var(--border);border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:12px;">
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--txt2);text-transform:uppercase;letter-spacing:.04em;">Employee ID</label>
          <input id="hrEmpId" type="text" value="${esc(suggestedId)}" style="width:100%;box-sizing:border-box;margin-top:4px;
            background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--txt1);font-size:13px;padding:8px 10px;"/>
          <div style="font-size:10px;color:var(--txt2);margin-top:3px;">Auto-suggested — change if this ID is already taken.</div>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--txt2);text-transform:uppercase;letter-spacing:.04em;">Full Name</label>
          <input id="hrEmpName" type="text" placeholder="e.g. Priya Kumar" style="width:100%;box-sizing:border-box;margin-top:4px;
            background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--txt1);font-size:13px;padding:8px 10px;"/>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--txt2);text-transform:uppercase;letter-spacing:.04em;">Team</label>
          <input id="hrEmpTeam" list="hrTeamOptions" type="text" placeholder="e.g. 3D, Design, Development…" style="width:100%;box-sizing:border-box;margin-top:4px;
            background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--txt1);font-size:13px;padding:8px 10px;"/>
          <datalist id="hrTeamOptions">${teams.map(t => `<option value="${esc(t)}">`).join('')}</datalist>
        </div>
        <div>
          <label style="font-size:11px;font-weight:700;color:var(--txt2);text-transform:uppercase;letter-spacing:.04em;">Login Password</label>
          <input id="hrEmpPw" type="text" placeholder="e.g. pass133" style="width:100%;box-sizing:border-box;margin-top:4px;
            background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--txt1);font-size:13px;padding:8px 10px;"/>
        </div>
        <div id="hrAddEmpErr" style="display:none;font-size:12px;color:#f87171;"></div>
        <button type="submit" id="hrAddEmpBtn" style="background:var(--a1);color:#fff;border:none;border-radius:8px;
          padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;margin-top:4px;">Create Employee</button>
      </form>
    </div>
  `;

  $('hrAddEmpForm').addEventListener('submit', async ev => {
    ev.preventDefault();
    const id   = $('hrEmpId').value.trim();
    const name = $('hrEmpName').value.trim();
    const team = $('hrEmpTeam').value.trim();
    const pw   = $('hrEmpPw').value.trim();
    const err  = $('hrAddEmpErr'), btn = $('hrAddEmpBtn');
    err.style.display = 'none';

    if (!id || !name || !team || !pw) {
      err.textContent = 'Please fill in every field.';
      err.style.display = 'block';
      return;
    }
    const employees = (typeof CP_EMPLOYEES !== 'undefined' ? CP_EMPLOYEES : HR_EMPLOYEES);
    if (employees.some(e => e.id === id)) {
      err.textContent = `Employee ID "${id}" already exists.`;
      err.style.display = 'block';
      return;
    }

    btn.disabled = true; btn.textContent = 'Creating…';
    try {
      await sheetGET({
        action: 'createEmployee',
        data:   encodeURIComponent(JSON.stringify({ id, name, team, pw })),
      });

      const newEmp = { id, name, team, pw };
      HR_EMPLOYEES.push(newEmp);
      if (typeof CP_EMPLOYEES !== 'undefined') CP_EMPLOYEES.push(newEmp);
      // Employees list just changed — clear the cached getMasterData
      // response so the next load (any portal) picks up the new
      // employee instead of serving a stale cached list.
      if (typeof clearMasterDataCache === 'function') clearMasterDataCache();

      toast('s', 'Employee created', `${name} (${id}) can now log in.`);
      renderHRAddEmployeeTab($('hrTabContent')); // reset form, next suggested ID
    } catch(e) {
      err.textContent = e.message || 'Failed to create employee.';
      err.style.display = 'block';
      btn.disabled = false; btn.textContent = 'Create Employee';
    }
  });
}

// ══════════════════════════════════════════════════
// MANAGE EMPLOYEES — edit an existing employee's team, ID, password,
// and Active/In-Active status. Reuses the exact same lookup-by-name
// convention Code.gs's updateEmployeeRecord already enforces (see
// that function's comments) — this UI is just a form in front of it.
// The Employee ID field is pre-filled with the current ID (editable
// directly, e.g. to correct a typo) — only sent as a change if it
// actually differs from what it started as. Password is a separate
// opt-in "New Password" field (blank = keep existing); the backend
// only requires both to be non-blank when reactivating a legacy row
// that currently has no login credentials at all, and reports that
// as a normal error message if needed but left blank.
// ══════════════════════════════════════════════════
function renderHRManageEmployeesTab(content) {
  const employees = (typeof CP_EMPLOYEES !== 'undefined' ? CP_EMPLOYEES : HR_EMPLOYEES)
    .slice()
    .sort((a, b) => (a.active === b.active ? 0 : a.active ? -1 : 1) || (a.name || '').localeCompare(b.name || ''));

  content.innerHTML = `
    <div style="margin-bottom:1.1rem;">
      <div style="font-size:16px;font-weight:700;color:var(--txt1);">✏️ Manage Employees</div>
      <div style="font-size:12px;color:var(--txt2);">Edit team or toggle Active / In-Active. Reactivating a row with no Employee ID/Password on file will ask you to set one.</div>
    </div>
    <div style="background:var(--surface1);border:1px solid var(--border);border-radius:12px;overflow:hidden;">
      ${employees.map((emp, i) => `
        <div class="hr-manage-row" data-name="${esc(emp.name)}" style="padding:12px 16px;${i > 0 ? 'border-top:1px solid var(--border);' : ''}
          display:flex;align-items:center;gap:14px;flex-wrap:wrap;">
          <div style="min-width:160px;flex:1 1 160px;">
            <div style="font-size:13px;font-weight:700;color:var(--txt1);">${esc(emp.name)}</div>
            <div style="font-size:10.5px;color:var(--txt2);">${esc(emp.id)}</div>
          </div>
          <div style="flex:0 0 140px;">
            <label style="font-size:9.5px;color:var(--txt2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:3px;">Team</label>
            <input type="text" class="hr-manage-team" value="${esc(emp.team || '')}" style="width:100%;box-sizing:border-box;
              background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--txt1);font-size:12px;padding:6px 8px;"/>
          </div>
          <div style="flex:0 0 130px;">
            <label style="font-size:9.5px;color:var(--txt2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:3px;">Status</label>
            <select class="hr-manage-status" style="width:100%;box-sizing:border-box;
              background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--txt1);font-size:12px;padding:6px 8px;">
              <option value="Active" ${emp.active !== false ? 'selected' : ''}>Active</option>
              <option value="Inactive" ${emp.active === false ? 'selected' : ''}>In-Active</option>
            </select>
          </div>
          <div style="flex:0 0 120px;">
            <label style="font-size:9.5px;color:var(--txt2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:3px;">Employee ID</label>
            <input type="text" class="hr-manage-newid" value="${esc(emp.id && !String(emp.id).startsWith('INACTIVE-') ? emp.id : '')}" placeholder="required to activate" style="width:100%;box-sizing:border-box;
              background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--txt1);font-size:12px;padding:6px 8px;"/>
          </div>
          <div style="flex:0 0 100px;">
            <label style="font-size:9.5px;color:var(--txt2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:3px;" title="How many past days this employee can log/edit entries for. Default is 2 for everyone — raise it for someone who needs to catch up on a backlog.">Entry Window</label>
            <input type="number" min="1" max="60" class="hr-manage-daysback" value="${emp.extendedDaysBack ? emp.extendedDaysBack : ''}" placeholder="2 (default)" style="width:100%;box-sizing:border-box;
              background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--txt1);font-size:12px;padding:6px 8px;"/>
          </div>
          <div style="flex:0 0 120px;">
            <label style="font-size:9.5px;color:var(--txt2);text-transform:uppercase;letter-spacing:.3px;display:block;margin-bottom:3px;">New Password</label>
            <input type="text" class="hr-manage-newpw" placeholder="optional" style="width:100%;box-sizing:border-box;
              background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--txt1);font-size:12px;padding:6px 8px;"/>
          </div>
          <button class="hr-manage-save" style="background:var(--a1);color:#fff;border:none;border-radius:6px;
            padding:7px 14px;font-size:12px;font-weight:700;cursor:pointer;align-self:flex-end;">Save</button>
          <div class="hr-manage-err" style="display:none;font-size:11px;color:#f87171;flex-basis:100%;"></div>
        </div>`).join('')}
    </div>
  `;

  content.querySelectorAll('.hr-manage-row').forEach(row => {
    row.querySelector('.hr-manage-save').addEventListener('click', async () => {
      const originalName = row.dataset.name;
      const team   = row.querySelector('.hr-manage-team').value.trim();
      const status = row.querySelector('.hr-manage-status').value;
      const newId  = row.querySelector('.hr-manage-newid').value.trim();
      const newPw  = row.querySelector('.hr-manage-newpw').value.trim();
      const extendedDaysBack = row.querySelector('.hr-manage-daysback').value.trim();
      const errEl  = row.querySelector('.hr-manage-err');
      const btn    = row.querySelector('.hr-manage-save');
      errEl.style.display = 'none';

      btn.disabled = true; btn.textContent = 'Saving…';
      try {
        const result = await apiUpdateEmployeeRecord({
          role: 'hr', originalName, team, status, newId, newPw, extendedDaysBack,
        });

        // Reflect locally so the list doesn't need a full reload.
        const employees = (typeof CP_EMPLOYEES !== 'undefined' ? CP_EMPLOYEES : HR_EMPLOYEES);
        const localEmp = employees.find(e => e.name === originalName);
        if (localEmp) {
          localEmp.team = team;
          localEmp.active = status === 'Active';
          localEmp.extendedDaysBack = parseInt(extendedDaysBack, 10) || 0;
          if (result.name) localEmp.name = result.name;
        }
        // Employee record just changed — clear the cached
        // getMasterData response, same reasoning as createEmployee.
        if (typeof clearMasterDataCache === 'function') clearMasterDataCache();

        toast('s', 'Employee updated', `${originalName} · ${status === 'Active' ? 'Active' : 'In-Active'}`);
        renderHRManageEmployeesTab($('hrTabContent'));
      } catch (e) {
        errEl.textContent = e.message || 'Failed to update.';
        errEl.style.display = 'block';
        btn.disabled = false; btn.textContent = 'Save';
      }
    });
  });
}