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