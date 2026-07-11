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

// --- Stripe Billing ---

/** Get the current subscription and plan info for a user. */
export const getSubscription = createServerFn({ method: "POST" })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const { getUserSubscription } = await import("./stripe-service");
    return await getUserSubscription(data.userId);
  });

/** Create a Stripe Checkout session for upgrading to a paid plan. */
export const createCheckout = createServerFn({ method: "POST" })
  .validator((d: { userId: string; email: string; name: string; planId: string }) => d)
  .handler(async ({ data }) => {
    const { createCheckoutSession } = await import("./stripe-service");
    const origin = process.env.PUBLIC_URL || "https://retroai.ctonew.app";
    return await createCheckoutSession({
      userId: data.userId,
      email: data.email,
      name: data.name,
      planId: data.planId,
      successUrl: `${origin}/dashboard?checkout=success&plan=${data.planId}`,
      cancelUrl: `${origin}/dashboard?checkout=canceled`,
    });
  });

/** Create a Stripe Billing Portal session. */
export const createPortal = createServerFn({ method: "POST" })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const { createBillingPortalSession } = await import("./stripe-service");
    const origin = process.env.PUBLIC_URL || "https://retroai.ctonew.app";
    return await createBillingPortalSession({
      userId: data.userId,
      returnUrl: `${origin}/dashboard`,
    });
  });

/** Handle Stripe webhook events. */
export const stripeWebhook = createServerFn({ method: "POST" })
  .handler(async ({ request }) => {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature") || "";
    const { handleWebhook } = await import("./stripe-service");
    return await handleWebhook(rawBody, signature);
  });

/** Check if user can generate a retro report (rate limit for free plan). */
export const checkReportLimit = createServerFn({ method: "POST" })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const { canGenerateReport } = await import("./stripe-service");
    return await canGenerateReport(data.userId);
  });

/** Manually set a user's plan (for testing/admin). */
export const setUserPlan = createServerFn({ method: "POST" })
  .validator((d: { userId: string; plan: string }) => d)
  .handler(async ({ data }) => {
    const { initSchema, updateUserPlan, upsertSubscription } = await import("./retroai-db");
    const { randomUUID } = await import("node:crypto");
    await initSchema();
    await updateUserPlan(data.userId, data.plan);
    await upsertSubscription(randomUUID(), data.userId, null, null, data.plan, "active", null);
    return { ok: true, plan: data.plan };
  });

// --- GitHub OAuth ---

/** Get the GitHub OAuth authorization URL for the given user. */
export const getGitHubAuthUrl = createServerFn({ method: "POST" })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const { randomUUID } = await import("node:crypto");
    const { initSchema, saveOAuthState } = await import("./retroai-db");
    const { getAuthorizationUrl } = await import("./github-service");
    await initSchema();

    const state = randomUUID();
    const stateId = randomUUID();
    await saveOAuthState(stateId, data.userId, state);

    const url = getAuthorizationUrl(state);
    return { url };
  });

/** Handle GitHub OAuth callback — exchange code for token, store connection. */
export const handleGitHubCallback = createServerFn({ method: "POST" })
  .validator((d: { code: string; state: string; userId: string }) => d)
  .handler(async ({ data }) => {
    const { randomUUID } = await import("node:crypto");
    const { initSchema, verifyOAuthState, upsertConnection } = await import("./retroai-db");
    const { exchangeCodeForToken, getGitHubUser, getUserRepos } = await import("./github-service");
    await initSchema();

    // Verify CSRF state
    const storedUserId = await verifyOAuthState(data.state);
    if (!storedUserId || storedUserId !== data.userId) {
      return { error: "Invalid or expired OAuth state. Please try again." };
    }

    // Exchange code for access token
    const tokenResult = await exchangeCodeForToken(data.code);
    if (!tokenResult.access_token) {
      return { error: tokenResult.error || "Failed to get GitHub access token" };
    }

    // Fetch GitHub user info
    const githubUser = await getGitHubUser(tokenResult.access_token);
    if (!githubUser) {
      return { error: "Failed to fetch GitHub user info" };
    }

    // Fetch repos
    const repos = await getUserRepos(tokenResult.access_token);
    const repoList = repos.map((r) => ({
      name: r.full_name,
      private: r.private,
      description: r.description,
    }));

    // Store connection
    const connectionId = randomUUID();
    await upsertConnection(
      connectionId,
      data.userId,
      "github",
      String(githubUser.id),
      tokenResult.access_token,
      repoList
    );

    return {
      success: true,
      githubUser: {
        id: githubUser.id,
        login: githubUser.login,
        avatar_url: githubUser.avatar_url,
        name: githubUser.name,
      },
      repos: repoList,
    };
  });

/** Get the current GitHub connection status for a user. */
export const getGitHubConnection = createServerFn({ method: "POST" })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const { initSchema, getConnection } = await import("./retroai-db");
    await initSchema();

    const conn = await getConnection(data.userId, "github");
    if (!conn) {
      return { connected: false };
    }

    return {
      connected: true,
      providerUserId: conn.provider_user_id,
      repos: JSON.parse(conn.repos || "[]"),
    };
  });

/** Disconnect GitHub. */
export const disconnectGitHub = createServerFn({ method: "POST" })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const { initSchema, deleteConnection } = await import("./retroai-db");
    await initSchema();
    await deleteConnection(data.userId, "github");
    return { success: true };
  });

/** Fetch repositories from the user's GitHub connection. */
export const fetchGitHubRepos = createServerFn({ method: "POST" })
  .validator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const { initSchema, getConnection } = await import("./retroai-db");
    const { getUserRepos } = await import("./github-service");
    await initSchema();

    const conn = await getConnection(data.userId, "github");
    if (!conn || !conn.access_token) {
      return { repos: [] };
    }

    const repos = await getUserRepos(conn.access_token);
    const repoList = repos.map((r) => ({
      name: r.full_name,
      private: r.private,
      description: r.description,
    }));

    // Update stored repos
    const { upsertConnection } = await import("./retroai-db");
    const { randomUUID } = await import("node:crypto");
    await upsertConnection(conn.id, data.userId, "github", conn.provider_user_id, conn.access_token, repoList);

    return { repos: repoList };
  });

/** Save selected repos for a user's GitHub connection. */
export const saveSelectedRepos = createServerFn({ method: "POST" })
  .validator((d: { userId: string; selectedRepos: string[] }) => d)
  .handler(async ({ data }) => {
    const { initSchema, getConnection } = await import("./retroai-db");
    await initSchema();

    const conn = await getConnection(data.userId, "github");
    if (!conn) {
      return { error: "No GitHub connection found" };
    }

    // Store selected repo names only (the full repo list stays as-is)
    // We just save the selection to a separate place or update the connection
    const allRepos = JSON.parse(conn.repos || "[]");
    const updatedRepos = allRepos.map((r: any) => ({
      ...r,
      selected: data.selectedRepos.includes(r.name),
    }));

    const { upsertConnection } = await import("./retroai-db");
    const { randomUUID } = await import("node:crypto");
    await upsertConnection(conn.id, data.userId, "github", conn.provider_user_id, conn.access_token, updatedRepos);

    return { success: true };
  });

// --- Sprint Analysis ---

/** Run a sprint analysis on a GitHub repo and optionally generate a report. */
export const runSprintAnalysis = createServerFn({ method: "POST" })
  .validator((d: {
    userId: string;
    teamId: string;
    repoOwner: string;
    repoName: string;
    sprintName: string;
    periodStart: string;
    periodEnd: string;
    generateReport?: boolean;
  }) => d)
  .handler(async ({ data }) => {
    const { randomUUID } = await import("node:crypto");
    const { initSchema, getConnection, saveSprintAnalysis, getLatestSprint, createReport } = await import("./retroai-db");
    const { analyzeSprint, toSprintMetrics, computeChanges } = await import("./metrics-engine");
    const { generateRetroReport } = await import("./llm-service");
    await initSchema();

    // Get GitHub access token from connection
    const conn = await getConnection(data.userId, "github");
    const accessToken = conn?.access_token ?? undefined;

    // Run the analysis
    const result = await analyzeSprint({
      owner: data.repoOwner,
      repo: data.repoName,
      sprintName: data.sprintName,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      accessToken,
    });

    // Try to compare with previous sprint
    const prevSprint = await getLatestSprint(data.teamId);
    if (prevSprint) {
      const previousMetrics = {
        cycleTime: prevSprint.cycle_time,
        cycleTimeChange: prevSprint.cycle_time_change,
        prThroughput: prevSprint.pr_throughput,
        prThroughputChange: prevSprint.pr_throughput_change,
        bugChurnPercent: prevSprint.bug_churn_pct,
        bugChurnChange: prevSprint.bug_churn_change,
        reworkRatePercent: prevSprint.rework_rate_pct,
        reworkRateChange: prevSprint.rework_rate_change,
        avgPrSize: prevSprint.avg_pr_size,
        avgReviewTime: prevSprint.avg_review_time,
        totalCommits: prevSprint.total_commits,
        contributors: prevSprint.contributors,
        topContributors: JSON.parse(prevSprint.top_contributors || "[]"),
        prsByDay: JSON.parse(prevSprint.prs_by_day || "[]"),
      };
      result.metrics = computeChanges(result.metrics, previousMetrics);
    }

    // Save the analysis
    const sprintId = randomUUID();
    await saveSprintAnalysis(
      sprintId, data.teamId, data.repoOwner, data.repoName,
      data.sprintName, data.periodStart, data.periodEnd,
      result.metrics, null
    );

    // Generate retro report if requested
    let report = null;
    if (data.generateReport) {
      const teamName = `${data.repoOwner}/${data.repoName}`;
      const sprintMetrics = toSprintMetrics(result, teamName);
      const retroReport = await generateRetroReport(sprintMetrics);

      const reportId = randomUUID();
      await createReport(
        reportId, data.teamId, data.userId,
        retroReport.title, data.periodStart, data.periodEnd,
        retroReport.summary, JSON.stringify(retroReport.insights),
        JSON.stringify(retroReport.actionItems),
        JSON.stringify(retroReport.metrics), retroReport.status
      );

      report = {
        id: reportId,
        title: retroReport.title,
        status: retroReport.status,
        summary: retroReport.summary,
        insights: retroReport.insights,
        actionItems: retroReport.actionItems,
        metrics: retroReport.metrics,
      };
    }

    return {
      sprintId,
      report,
      metrics: result.metrics,
      rawPRs: result.rawPRs,
      rawCommits: result.rawCommits,
      comparedToPrevious: !!prevSprint,
    };
  });

/** Get sprint history for a team. */
export const getSprintHistory = createServerFn({ method: "POST" })
  .validator((d: { teamId: string }) => d)
  .handler(async ({ data }) => {
    const { initSchema, getSprintHistory } = await import("./retroai-db");
    await initSchema();
    return await getSprintHistory(data.teamId);
  });