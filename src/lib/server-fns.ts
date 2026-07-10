/**
 * RetroAI server functions — all DB imports are lazy to prevent client bundling.
 */
import { createServerFn } from "@tanstack/react-start";
import { randomUUID } from "node:crypto";

// --- bcryptjs wrapper (lazy import) ---
async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 12);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.compare(password, hash);
}

// --- Server Functions ---

export const init = createServerFn({ method: "GET" }).handler(async () => {
  const { initSchema } = await import("./retroai-db");
  await initSchema();
  return { ok: true };
});

export const registerUser = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string; name: string }) => d)
  .handler(async ({ data }) => {
    const { initSchema, createUser, getUserByEmail, createSession } = await import("./retroai-db");
    await initSchema();
    const existing = await getUserByEmail(data.email);
    if (existing) return { error: "Email already registered" };
    
    const hash = await hashPassword(data.password);
    const userId = randomUUID();
    await createUser(userId, data.email, data.name, hash);
    
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await createSession(randomUUID(), userId, token, expiresAt);
    return { token, user: { id: userId, email: data.email, name: data.name, plan: "free" as const } };
  });

export const loginUser = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const { initSchema, getUserByEmail, createSession } = await import("./retroai-db");
    await initSchema();
    const user = await getUserByEmail(data.email);
    if (!user) return { error: "Invalid email or password" };
    
    const valid = await verifyPassword(data.password, user.password_hash);
    if (!valid) return { error: "Invalid email or password" };
    
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await createSession(randomUUID(), user.id, token, expiresAt);
    return { token, user: { id: user.id, email: user.email, name: user.name, plan: user.plan } };
  });

/** Validate a session token. Returns user info if valid, null otherwise. */
export const validateSession = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const { getSessionByToken, getUserById } = await import("./retroai-db");
    const session = await getSessionByToken(data.token);
    if (!session) return { user: null };
    const user = await getUserById(session.user_id);
    if (!user) return { user: null };
    return { user: { id: user.id, email: user.email, name: user.name, plan: user.plan } };
  });

/** Logout: delete session by token. */
export const logoutUser = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const { deleteSession } = await import("./retroai-db");
    await deleteSession(data.token);
    return { ok: true };
  });

export const getDashboard = createServerFn({ method: "GET" })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const { initSchema, getTeamsForUser, getReportsForTeam } = await import("./retroai-db");
    await initSchema();
    const teams = await getTeamsForUser(data.userId);
    const reports = teams.length > 0 ? await getReportsForTeam(teams[0].id) : [];
    return { teams, reports };
  });

/** Submit a waitlist signup (email + timestamp). */
export const submitWaitlist = createServerFn({ method: "POST" })
  .validator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    const { randomUUID } = await import("node:crypto");
    const { initSchema, addWaitlistSignup } = await import("./retroai-db");
    await initSchema();
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      return { success: false, error: "Please enter a valid email address" };
    }
    const ok = await addWaitlistSignup(randomUUID(), data.email);
    if (!ok) return { success: false, error: "This email is already on the waitlist!" };
    return { success: true };
  });

// --- Retro Report Generation ---

interface SprintMetricsInput {
  teamName: string;
  sprintName: string;
  periodStart: string;
  periodEnd: string;
  cycleTime: number;
  cycleTimeChange: number | null;
  prThroughput: number;
  prThroughputChange: number | null;
  bugChurnPercent: number;
  bugChurnChange: number | null;
  reworkRatePercent: number;
  reworkRateChange: number | null;
  avgPrSize: number;
  avgReviewTime: number;
  totalCommits: number;
  contributors: number;
  topContributors: string[];
  failureRate?: number;
}

/** Generate a retro report from sprint metrics data. */
export const generateRetroReport = createServerFn({ method: "POST" })
  .validator((d: { userId: string; teamId: string; metrics: SprintMetricsInput }) => d)
  .handler(async ({ data }) => {
    const { randomUUID } = await import("node:crypto");
    const { initSchema, createReport, getTeamsForUser } = await import("./retroai-db");
    const { generateRetroReport: generateReport } = await import("./llm-service");
    await initSchema();

    // Verify the user belongs to the team
    const teams = await getTeamsForUser(data.userId);
    const team = teams.find((t: any) => t.id === data.teamId);
    if (!team) {
      return { error: "Team not found or you don't have access" };
    }

    const report = await generateReport({
      ...data.metrics,
      teamName: team.name,
    });

    const reportId = randomUUID();
    const insights = JSON.stringify(report.insights);
    const actionItems = JSON.stringify(report.actionItems);
    const metrics = JSON.stringify(report.metrics);

    await createReport(
      reportId, data.teamId, data.userId,
      report.title, data.metrics.periodStart, data.metrics.periodEnd,
      report.summary, insights, actionItems, metrics, report.status
    );

    return {
      id: reportId,
      title: report.title,
      periodStart: data.metrics.periodStart,
      periodEnd: data.metrics.periodEnd,
      team: team.name,
      status: report.status,
      cycleTime: report.metrics.cycleTime,
      prThroughput: report.metrics.prThroughput,
      bugChurn: report.metrics.bugChurn,
      reworkRate: report.metrics.reworkRate,
      summary: report.summary,
      insights: report.insights,
      actionItems: report.actionItems,
    };
  });

/** Get all reports for a team. */
export const getDashboardReports = createServerFn({ method: "POST" })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const { initSchema, getTeamsForUser, getReportsForTeam } = await import("./retroai-db");
    await initSchema();
    const teams = await getTeamsForUser(data.userId);
    if (teams.length === 0) return { teams: [], reports: [] };
    const reports = await getReportsForTeam(teams[0].id);
    return {
      teams: teams.map((t: any) => ({ id: t.id, name: t.name })),
      reports: reports.map((r: any) => ({
        id: r.id,
        title: r.title,
        periodStart: r.period_start,
        periodEnd: r.period_end,
        team: teams[0].name,
        status: r.status,
        cycleTime: JSON.parse(r.metrics || "{}").cycleTime || "—",
        prThroughput: JSON.parse(r.metrics || "{}").prThroughput || 0,
        bugChurn: JSON.parse(r.metrics || "{}").bugChurn || "—",
        reworkRate: JSON.parse(r.metrics || "{}").reworkRate || "—",
        summary: r.summary || "",
        insights: JSON.parse(r.insights || "[]"),
        actionItems: JSON.parse(r.action_items || "[]"),
      })),
    };
  });