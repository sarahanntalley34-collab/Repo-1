/**
 * RetroAI database layer — wraps team-db CLI for structured SQLite access.
 * SERVER-ONLY: All functions import child_process lazily so client bundling works.
 */

async function query<T = Record<string, unknown>>(sql: string): Promise<T[]> {
  const { execSync } = await import("node:child_process");
  const raw = execSync(`team-db "${sql.replace(/"/g, '\\"')}"`, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
  return JSON.parse(raw) as T[];
}

async function execute(sql: string): Promise<void> {
  const { execSync } = await import("node:child_process");
  execSync(`team-db "${sql.replace(/"/g, '\\"')}"`, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
  });
}

const SCHEMA_SQL = [
  `CREATE TABLE IF NOT EXISTS retros_users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL, plan TEXT NOT NULL DEFAULT 'free',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS retros_teams (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, owner_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (owner_id) REFERENCES retros_users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS retros_team_members (
    team_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'member',
    joined_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (team_id, user_id),
    FOREIGN KEY (team_id) REFERENCES retros_teams(id),
    FOREIGN KEY (user_id) REFERENCES retros_users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS retros_connections (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, provider TEXT NOT NULL DEFAULT 'github',
    provider_user_id TEXT, access_token TEXT, refresh_token TEXT,
    repos TEXT DEFAULT '[]', created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES retros_users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS retros_reports (
    id TEXT PRIMARY KEY, team_id TEXT NOT NULL, created_by TEXT NOT NULL,
    title TEXT NOT NULL, period_start TEXT, period_end TEXT,
    summary TEXT, insights TEXT DEFAULT '[]', action_items TEXT DEFAULT '[]',
    metrics TEXT DEFAULT '{}', status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (team_id) REFERENCES retros_teams(id),
    FOREIGN KEY (created_by) REFERENCES retros_users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS retros_subscriptions (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, stripe_customer_id TEXT,
    stripe_subscription_id TEXT, plan TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active', current_period_end TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES retros_users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS retros_sessions (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES retros_users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS retros_waitlist (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS retros_oauth_states (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, state TEXT NOT NULL,
    expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES retros_users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS retros_sprints (
    id TEXT PRIMARY KEY, team_id TEXT NOT NULL, repo_owner TEXT NOT NULL,
    repo_name TEXT NOT NULL, sprint_name TEXT NOT NULL,
    period_start TEXT NOT NULL, period_end TEXT NOT NULL,
    cycle_time REAL NOT NULL DEFAULT 0, cycle_time_change REAL,
    pr_throughput INTEGER NOT NULL DEFAULT 0, pr_throughput_change REAL,
    bug_churn_pct REAL NOT NULL DEFAULT 0, bug_churn_change REAL,
    rework_rate_pct REAL NOT NULL DEFAULT 0, rework_rate_change REAL,
    avg_pr_size INTEGER NOT NULL DEFAULT 0,
    avg_review_time REAL NOT NULL DEFAULT 0,
    total_commits INTEGER NOT NULL DEFAULT 0,
    contributors INTEGER NOT NULL DEFAULT 0,
    top_contributors TEXT DEFAULT '[]',
    prs_by_day TEXT DEFAULT '[]',
    report_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (team_id) REFERENCES retros_teams(id)
  )`,
];

export async function initSchema(): Promise<void> {
  for (const stmt of SCHEMA_SQL) {
    try { await execute(stmt); } catch { /* already exists */ }
  }
}

function esc(v: string): string { return `'${v.replace(/'/g, "''")}'`; }

export async function createUser(id: string, email: string, name: string, pwHash: string) {
  await query(`INSERT INTO retros_users (id,email,name,password_hash) VALUES (${[id,email,name,pwHash].map(esc).join(",")})`);
}
export async function getUserByEmail(email: string) {
  const r = await query<any>(`SELECT * FROM retros_users WHERE email=${esc(email)} LIMIT 1`);
  return r[0] ?? null;
}
export async function getUserById(id: string) {
  const r = await query<any>(`SELECT * FROM retros_users WHERE id=${esc(id)} LIMIT 1`);
  return r[0] ?? null;
}
export async function createSession(id: string, userId: string, token: string, expiresAt: string) {
  await query(`INSERT INTO retros_sessions (id,user_id,token,expires_at) VALUES (${[id,userId,token,expiresAt].map(esc).join(",")})`);
}
export async function getSessionByToken(token: string) {
  const r = await query<any>(`SELECT * FROM retros_sessions WHERE token=${esc(token)} AND expires_at > datetime('now') LIMIT 1`);
  return r[0] ?? null;
}
export async function deleteSession(token: string) {
  await query(`DELETE FROM retros_sessions WHERE token=${esc(token)}`);
}
export async function createTeam(id: string, name: string, ownerId: string) {
  await query(`INSERT INTO retros_teams (id,name,owner_id) VALUES (${[id,name,ownerId].map(esc).join(",")})`);
  await query(`INSERT INTO retros_team_members (team_id,user_id,role) VALUES (${[id,ownerId,'owner'].map(esc).join(",")})`);
}
export async function getTeamsForUser(userId: string) {
  return await query<any>(`SELECT t.* FROM retros_teams t JOIN retros_team_members tm ON t.id=tm.team_id WHERE tm.user_id=${esc(userId)}`);
}
export async function getReportsForTeam(teamId: string) {
  return await query<any>(`SELECT * FROM retros_reports WHERE team_id=${esc(teamId)} ORDER BY created_at DESC`);
}
export async function saveConnection(id: string, userId: string, provider: string, providerUserId: string|null, accessToken: string|null, repos: string[]) {
  const pui = providerUserId ? esc(providerUserId) : "NULL";
  const at = accessToken ? esc(accessToken) : "NULL";
  await query(`INSERT INTO retros_connections (id,user_id,provider,provider_user_id,access_token,repos) VALUES (${[id,userId,provider].map(esc).join(",")},${pui},${at},${esc(JSON.stringify(repos))})`);
}
export async function addWaitlistSignup(id: string, email: string): Promise<boolean> {
  try {
    await query(`INSERT INTO retros_waitlist (id,email) VALUES (${esc(id)},${esc(email)})`);
    return true;
  } catch {
    return false; // duplicate or error
  }
}

export async function createReport(
  id: string, teamId: string, createdBy: string,
  title: string, periodStart: string, periodEnd: string,
  summary: string, insights: string, actionItems: string,
  metrics: string, status: string
) {
  await query(
    `INSERT INTO retros_reports (id,team_id,created_by,title,period_start,period_end,summary,insights,action_items,metrics,status) ` +
    `VALUES (${[id,teamId,createdBy,title,periodStart,periodEnd,summary,insights,actionItems,metrics,status].map(esc).join(",")})`
  );
}

export async function getReportById(id: string) {
  const r = await query<any>(`SELECT * FROM retros_reports WHERE id=${esc(id)} LIMIT 1`);
  return r[0] ?? null;
}

export async function deleteReport(id: string) {
  await query(`DELETE FROM retros_reports WHERE id=${esc(id)}`);
}

// --- Subscription Functions ---

export async function getSubscriptionByUserId(userId: string) {
  const r = await query<any>(`SELECT * FROM retros_subscriptions WHERE user_id=${esc(userId)} ORDER BY created_at DESC LIMIT 1`);
  return r[0] ?? null;
}

export async function upsertSubscription(
  id: string, userId: string, stripeCustomerId: string | null,
  stripeSubscriptionId: string | null, plan: string, status: string,
  currentPeriodEnd: string | null
) {
  // Delete any existing subscription for this user
  await query(`DELETE FROM retros_subscriptions WHERE user_id=${esc(userId)}`);
  const cusId = stripeCustomerId ? esc(stripeCustomerId) : "NULL";
  const subId = stripeSubscriptionId ? esc(stripeSubscriptionId) : "NULL";
  const periodEnd = currentPeriodEnd ? esc(currentPeriodEnd) : "NULL";
  await query(
    `INSERT INTO retros_subscriptions (id,user_id,stripe_customer_id,stripe_subscription_id,plan,status,current_period_end) ` +
    `VALUES (${esc(id)},${esc(userId)},${cusId},${subId},${esc(plan)},${esc(status)},${periodEnd})`
  );
  // Also update the user's plan
  await query(`UPDATE retros_users SET plan=${esc(plan)} WHERE id=${esc(userId)}`);
}

export async function handleSubscriptionEvent(
  userId: string, stripeCustomerId: string, stripeSubscriptionId: string,
  plan: string, status: string, currentPeriodEnd: string | null
) {
  const { randomUUID } = await import("node:crypto");
  const id = randomUUID();
  await upsertSubscription(id, userId, stripeCustomerId, stripeSubscriptionId, plan, status, currentPeriodEnd);
}

export async function updateUserPlan(userId: string, plan: string) {
  await query(`UPDATE retros_users SET plan=${esc(plan)} WHERE id=${esc(userId)}`);
}

export async function getReportsForUser(userId: string) {
  return await query<any>(
    `SELECT r.* FROM retros_reports r JOIN retros_team_members tm ON r.team_id = tm.team_id WHERE tm.user_id=${esc(userId)} ORDER BY r.created_at DESC`
  );
}

// --- Sprint Analysis Storage ---

export async function saveSprintAnalysis(
  id: string, teamId: string, repoOwner: string, repoName: string,
  sprintName: string, periodStart: string, periodEnd: string,
  metrics: { cycleTime: number; cycleTimeChange: number | null; prThroughput: number; prThroughputChange: number | null; bugChurnPercent: number; bugChurnChange: number | null; reworkRatePercent: number; reworkRateChange: number | null; avgPrSize: number; avgReviewTime: number; totalCommits: number; contributors: number; topContributors: string[]; prsByDay: { day: string; count: number }[] },
  reportId: string | null
) {
  const cols = ["id", "team_id", "repo_owner", "repo_name", "sprint_name", "period_start", "period_end",
    "cycle_time", "cycle_time_change", "pr_throughput", "pr_throughput_change",
    "bug_churn_pct", "bug_churn_change", "rework_rate_pct", "rework_rate_change",
    "avg_pr_size", "avg_review_time", "total_commits", "contributors",
    "top_contributors", "prs_by_day", "report_id"];

  const vals = [
    esc(id), esc(teamId), esc(repoOwner), esc(repoName),
    esc(sprintName), esc(periodStart), esc(periodEnd),
    String(metrics.cycleTime),
    metrics.cycleTimeChange !== null ? String(metrics.cycleTimeChange) : "NULL",
    String(metrics.prThroughput),
    metrics.prThroughputChange !== null ? String(metrics.prThroughputChange) : "NULL",
    String(metrics.bugChurnPercent),
    metrics.bugChurnChange !== null ? String(metrics.bugChurnChange) : "NULL",
    String(metrics.reworkRatePercent),
    metrics.reworkRateChange !== null ? String(metrics.reworkRateChange) : "NULL",
    String(metrics.avgPrSize),
    String(metrics.avgReviewTime),
    String(metrics.totalCommits),
    String(metrics.contributors),
    esc(JSON.stringify(metrics.topContributors)),
    esc(JSON.stringify(metrics.prsByDay)),
    reportId ? esc(reportId) : "NULL",
  ];

  await query(
    `INSERT INTO retros_sprints (${cols.join(",")}) VALUES (${vals.join(",")})`
  );
}

export async function getLatestSprint(teamId: string) {
  const r = await query<any>(
    `SELECT * FROM retros_sprints WHERE team_id=${esc(teamId)} ORDER BY created_at DESC LIMIT 1`
  );
  return r[0] ?? null;
}

export async function getSprintHistory(teamId: string) {
  return await query<any>(
    `SELECT * FROM retros_sprints WHERE team_id=${esc(teamId)} ORDER BY created_at DESC LIMIT 10`
  );
}

// --- GitHub OAuth Functions ---

export async function getConnection(userId: string, provider: string = 'github') {
  const r = await query<any>(
    `SELECT * FROM retros_connections WHERE user_id=${esc(userId)} AND provider=${esc(provider)} LIMIT 1`
  );
  return r[0] ?? null;
}

export async function upsertConnection(
  id: string, userId: string, provider: string, providerUserId: string | null,
  accessToken: string | null, repos: string[]
) {
  // Delete any existing connection for this user + provider
  await query(`DELETE FROM retros_connections WHERE user_id=${esc(userId)} AND provider=${esc(provider)}`);
  const pui = providerUserId ? esc(providerUserId) : "NULL";
  const at = accessToken ? esc(accessToken) : "NULL";
  await query(
    `INSERT INTO retros_connections (id,user_id,provider,provider_user_id,access_token,repos) ` +
    `VALUES (${[id,userId,provider].map(esc).join(",")},${pui},${at},${esc(JSON.stringify(repos))})`
  );
}

export async function deleteConnection(userId: string, provider: string = 'github') {
  await query(`DELETE FROM retros_connections WHERE user_id=${esc(userId)} AND provider=${esc(provider)}`);
}

// --- OAuth State (CSRF protection) ---

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function saveOAuthState(id: string, userId: string, state: string) {
  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS).toISOString();
  await query(
    `INSERT INTO retros_oauth_states (id,user_id,state,expires_at) VALUES (${[id,userId,state].map(esc).join(",")},${esc(expiresAt)})`
  );
}

export async function verifyOAuthState(state: string): Promise<string | null> {
  const r = await query<any>(
    `SELECT user_id FROM retros_oauth_states WHERE state=${esc(state)} AND expires_at > datetime('now') LIMIT 1`
  );
  if (r[0]) {
    // Consume it (delete) to prevent replay
    await query(`DELETE FROM retros_oauth_states WHERE state=${esc(state)}`);
    return r[0].user_id;
  }
  return null;
}