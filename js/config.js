// ═══════════════════════════════════════════════════
// CONFIG.JS — toggle between demo and live Google Sheets
// ═══════════════════════════════════════════════════

const CONFIG = {
  // 👉 PASTE YOUR NEW TEAM'S APPS SCRIPT /exec URL HERE
  SHEETS_URL: 'https://script.google.com/macros/s/AKfycbxAG5bcQPgUdLtYI1bdVAMv9c5HLJH4ndxOP6-gYtkq4oYmr4N5RTBVoil4jYikWOf3/exec',

  DEMO_MODE: false,

  DEMO_PW:   'pass123',
  LS_THEME:  'tt_thm',
  LS_SESSION:'tt_sess',
  PAGE_SIZE: 20,

  // ── Role IDs ───────────────────────────────────
  // MANAGER_ID/HR_ID/TEAM_LEADERS' ids are still used here — they
  // tell the login dropdown which IDs to list. But the PASSWORDS for
  // these roles are no longer checked from this file: they live in
  // Code.gs's ROLE_ACCOUNTS constant instead (never shipped to the
  // browser, unlike this file). To change a Manager/HR/TL password,
  // edit ROLE_ACCOUNTS in Code.gs and redeploy the Apps Script — do
  // NOT edit a pw value here, it's ignored.
  MANAGER_ID: 'MGR',

  // Team Leader accounts — only `id` and `name` are used now (name
  // for display in the dropdown/portal header). `pw` is ignored;
  // the real password check happens against Code.gs's ROLE_ACCOUNTS.
  // Add or remove objects here to match however many Team Leaders
  // the team has — but also add/remove the matching entry in
  // Code.gs's ROLE_ACCOUNTS, or that ID's login will fail.
  TEAM_LEADERS: [
    { id: 'TL1', name: 'Team Leader 1' },
  ],

  // HR account — id only, see note above. pw ignored.
  HR_ID: 'HR',

  // ── App settings ──────────────────────────────
  CURRENCY:        '₹',
  OFFICE_START:    '09:30',
  LUNCH_MINS:      45,
  EXTENDED_START:  '19:30',
};