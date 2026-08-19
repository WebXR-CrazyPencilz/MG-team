// ═══════════════════════════════════════════════════
// CONFIG.JS — toggle between demo and live Google Sheets
// ═══════════════════════════════════════════════════

const CONFIG = {
  // 👉 PASTE YOUR NEW TEAM'S APPS SCRIPT /exec URL HERE
  SHEETS_URL: 'https://script.google.com/macros/s/AKfycbwaG9zTtq_M_0x3bytAE1dizu0-R-_99lZI-B1_rO0C-pvmqrhvshbXwPRAistBMck/exec',

  DEMO_MODE: false,

  DEMO_PW:   'pass123',
  LS_THEME:  'tt_thm',
  LS_SESSION:'tt_sess',
  PAGE_SIZE: 20,

  // ── Role credentials ──────────────────────────
  // Update these for the new team before going live.
  MANAGER_ID: 'MGR',
  MANAGER_PW: 'manager2026',

  // Team Leader accounts — each is its own login ID/password/
  // display name. Add, remove, or edit entries here directly
  // (same pattern as MANAGER_ID/MANAGER_PW above — there's no
  // sheet-backed account system for these roles, just constants here).
  // Add or remove objects in this array to match however many Team
  // Leaders the new team has.
  TEAM_LEADERS: [
    { id: 'TL1', pw: 'teamlead963', name: 'teamlead741' },
  ],

  // HR account — same pattern as MANAGER_ID/MANAGER_PW above (a
  // single constant login, no sheet-backed account system).
  HR_ID: 'HR',
  HR_PW: 'hraccess2026',

  // ── App settings ──────────────────────────────
  CURRENCY:        '₹',
  OFFICE_START:    '09:30',
  LUNCH_MINS:      45,
  EXTENDED_START:  '19:30',
};