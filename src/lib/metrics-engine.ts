/**
 * Metrics Engine — Core sprint data analysis pipeline.
 *
 * Fetches GitHub data (PRs, commits, issues) for a sprint period,
 * computes engineering metrics, and produces a SprintMetrics object
 * that feeds into the LLM retro report generator.
 *
 * SERVER-ONLY: Do not import from client code.
 */

// --- Types ---

export interface SprintConfig {
  owner: string;
  repo: string;
  sprintName: string;
  periodStart: string; // ISO date
  periodEnd: string;   // ISO date
  accessToken?: string;
}

export interface GitHubPR {
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  created_at: string;
  merged_at: string | null;
  closed_at: string | null;
  updated_at: string;
  additions: number;
  deletions: number;
  changed_files: number;
  user: { login: string };
  labels: { name: string }[];
  requested_reviewers: { login: string }[];
  review_comments: number;
  comments: number;
  head: { ref: string };
  base: { ref: string };
}

export interface GitHubReview {
  id: number;
  user: { login: string };
  submitted_at: string;
  state: "approved" | "changes_requested" | "commented" | "dismissed";
}

export interface GitHubCommit {
  sha: string;
  commit: { author: { date: string; name: string; email: string }; message: string };
  author: { login: string } | null;
}

export interface CalculatedMetrics {
  cycleTime: number;           // avg days from PR creation to merge
  cycleTimeChange: number | null;
  prThroughput: number;        // total merged PRs
  prThroughputChange: number | null;
  bugChurnPercent: number;     // % of PRs labeled as bug fixes
  bugChurnChange: number | null;
  reworkRatePercent: number;   // % of PRs that revert or fix previous PRs
  reworkRateChange: number | null;
  avgPrSize: number;           // avg lines changed per PR
  avgReviewTime: number;       // avg hours to first review
  totalCommits: number;
  contributors: number;
  topContributors: string[];
  prsByDay: { day: string; count: number }[];
  failureRate?: number;
}

// --- GitHub API Helpers ---

const GITHUB_API = "https://api.github.com";

async function githubFetch<T>(path: string, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "RetroAI",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${GITHUB_API}${path}`, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API error ${response.status}: ${response.statusText} for ${path}`);
  }
  return response.json() as Promise<T>;
}

async function githubFetchPaginated<T>(path: string, token?: string): Promise<T[]> {
  const allItems: T[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 10) {
    const response = await fetch(`${GITHUB_API}${path}&per_page=100&page=${page}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "RetroAI",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) break;
    const items: T[] = await response.json();
    allItems.push(...items);
    const linkHeader = response.headers.get("Link") || "";
    hasMore = linkHeader.includes('rel="next"');
    page++;
  }

  return allItems;
}

// --- Data Fetching ---

async function fetchMergedPRs(owner: string, repo: string, since: string, until: string, token?: string): Promise<GitHubPR[]> {
  // GitHub API: merged PRs in date range
  const prs = await githubFetchPaginated<GitHubPR>(
    `/repos/${owner}/${repo}/pulls?state=closed&sort=updated&direction=desc`,
    token
  );
  return prs.filter((pr) => {
    if (!pr.merged_at) return false;
    return pr.merged_at >= since && pr.merged_at <= until;
  });
}

async function fetchPRReviews(owner: string, repo: string, prNumber: number, token?: string): Promise<GitHubReview[]> {
  return githubFetchPaginated<GitHubReview>(
    `/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
    token
  );
}

async function fetchCommits(owner: string, repo: string, since: string, until: string, token?: string): Promise<GitHubCommit[]> {
  const commits = await githubFetchPaginated<GitHubCommit>(
    `/repos/${owner}/${repo}/commits?since=${since}&until=${until}`,
    token
  );
  return commits;
}

// --- Metrics Calculation ---

function isBugPR(pr: GitHubPR): boolean {
  const bugKeywords = ["bug", "fix", "hotfix", "regression", "defect", "issue"];
  const titleLower = pr.title.toLowerCase();
  const labels = pr.labels.map((l) => l.name.toLowerCase());

  return (
    labels.some((l) => bugKeywords.some((kw) => l.includes(kw))) ||
    bugKeywords.some((kw) => titleLower.includes(kw))
  );
}

function isReworkPR(pr: GitHubPR): boolean {
  const reworkKeywords = ["revert", "rework", "redesign", "refactor", "revert", "fixup"];
  const titleLower = pr.title.toLowerCase();
  return reworkKeywords.some((kw) => titleLower.includes(kw));
}

function calculateCycleTimeDays(pr: GitHubPR): number | null {
  if (!pr.merged_at) return null;
  const created = new Date(pr.created_at).getTime();
  const merged = new Date(pr.merged_at).getTime();
  return (merged - created) / (1000 * 60 * 60 * 24);
}

function calculateReviewTimeHours(pr: GitHubPR, reviews: GitHubReview[]): number | null {
  if (reviews.length === 0 || !pr.merged_at) return null;
  const firstReview = reviews.sort(
    (a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime()
  )[0];
  const created = new Date(pr.created_at).getTime();
  const reviewed = new Date(firstReview.submitted_at).getTime();
  return (reviewed - created) / (1000 * 60 * 60);
}

function getPRsByDay(prs: GitHubPR[]): { day: string; count: number }[] {
  const dayCount: Record<string, number> = {};
  for (const pr of prs) {
    if (pr.merged_at) {
      const day = pr.merged_at.split("T")[0];
      dayCount[day] = (dayCount[day] || 0) + 1;
    }
  }
  return Object.entries(dayCount)
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

// --- Main Analysis Function ---

export interface SprintAnalysisResult {
  sprintName: string;
  periodStart: string;
  periodEnd: string;
  metrics: CalculatedMetrics;
  rawPRs: number;
  rawCommits: number;
}

/**
 * Run a full sprint analysis against a GitHub repository.
 * Fetches all PRs and commits in the sprint period, computes metrics,
 * and returns a SprintAnalysisResult.
 */
export async function analyzeSprint(config: SprintConfig): Promise<SprintAnalysisResult> {
  const { owner, repo, sprintName, periodStart, periodEnd, accessToken } = config;

  // Fetch data
  const [mergedPRs, allCommits] = await Promise.all([
    fetchMergedPRs(owner, repo, periodStart, periodEnd, accessToken),
    fetchCommits(owner, repo, periodStart, periodEnd, accessToken),
  ]);

  // Calculate PR metrics
  const cycleTimes = mergedPRs.map(calculateCycleTimeDays).filter((t): t is number => t !== null);
  const prSizes = mergedPRs.map((pr) => pr.additions + pr.deletions);
  const bugPRs = mergedPRs.filter(isBugPR);
  const reworkPRs = mergedPRs.filter(isReworkPR);

  // Calculate review times (batch request reviews for top PRs)
  const topPRs = mergedPRs.slice(0, 30); // Limit to avoid rate limits
  const reviewsByPR: GitHubReview[][] = [];
  for (const pr of topPRs) {
    try {
      const reviews = await fetchPRReviews(owner, repo, pr.number, accessToken);
      reviewsByPR.push(reviews);
    } catch {
      reviewsByPR.push([]);
    }
  }

  const reviewTimes: number[] = [];
  for (let i = 0; i < topPRs.length; i++) {
    const time = calculateReviewTimeHours(topPRs[i], reviewsByPR[i]);
    if (time !== null) reviewTimes.push(time);
  }

  // Compute contributor stats
  const contributorMap = new Map<string, number>();
  for (const pr of mergedPRs) {
    const login = pr.user.login;
    contributorMap.set(login, (contributorMap.get(login) || 0) + 1);
  }
  const sortedContributors = [...contributorMap.entries()].sort((a, b) => b[1] - a[1]);
  const topContributors = sortedContributors.slice(0, 5).map(([name]) => name);

  // Try to load previous sprint data for comparison
  // In a real implementation, this would query the DB for the last sprint's metrics
  // For now we pass null and let the LLM service handle it

  const avgCycleTime = cycleTimes.length > 0
    ? cycleTimes.reduce((sum, t) => sum + t, 0) / cycleTimes.length
    : 0;

  const avgPrSize = prSizes.length > 0
    ? prSizes.reduce((sum, s) => sum + s, 0) / prSizes.length
    : 0;

  const avgReviewTime = reviewTimes.length > 0
    ? reviewTimes.reduce((sum, t) => sum + t, 0) / reviewTimes.length
    : 0;

  const metrics: CalculatedMetrics = {
    cycleTime: Math.round(avgCycleTime * 10) / 10,
    cycleTimeChange: null,
    prThroughput: mergedPRs.length,
    prThroughputChange: null,
    bugChurnPercent: mergedPRs.length > 0
      ? Math.round((bugPRs.length / mergedPRs.length) * 1000) / 10
      : 0,
    bugChurnChange: null,
    reworkRatePercent: mergedPRs.length > 0
      ? Math.round((reworkPRs.length / mergedPRs.length) * 1000) / 10
      : 0,
    reworkRateChange: null,
    avgPrSize: Math.round(avgPrSize),
    avgReviewTime: Math.round(avgReviewTime * 10) / 10,
    totalCommits: allCommits.length,
    contributors: contributorMap.size,
    topContributors,
    prsByDay: getPRsByDay(mergedPRs),
  };

  return {
    sprintName,
    periodStart,
    periodEnd,
    metrics,
    rawPRs: mergedPRs.length,
    rawCommits: allCommits.length,
  };
}

// --- Mock Data for Development ---

/**
 * Generate mock sprint metrics for development/testing.
 * Returns realistic-looking data that can be used without GitHub API access.
 */
export function generateMockMetrics(sprintName: string): {
  sprintName: string;
  periodStart: string;
  periodEnd: string;
  metrics: CalculatedMetrics;
} {
  const now = new Date();
  const periodEnd = now.toISOString().split("T")[0];
  const periodStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  return {
    sprintName,
    periodStart,
    periodEnd,
    metrics: {
      cycleTime: 2.4,
      cycleTimeChange: -17.2,
      prThroughput: 14,
      prThroughputChange: 12.5,
      bugChurnPercent: 8.3,
      bugChurnChange: -4.1,
      reworkRatePercent: 5.1,
      reworkRateChange: -2.3,
      avgPrSize: 185,
      avgReviewTime: 3.2,
      totalCommits: 87,
      contributors: 6,
      topContributors: ["alice", "bob", "charlie", "diana", "eve"],
      prsByDay: [
        { day: "2026-05-06", count: 2 },
        { day: "2026-05-08", count: 1 },
        { day: "2026-05-09", count: 3 },
        { day: "2026-05-12", count: 2 },
        { day: "2026-05-14", count: 1 },
        { day: "2026-05-15", count: 3 },
        { day: "2026-05-16", count: 2 },
      ],
    },
  };
}

// --- Previous Sprint Comparator ---

/**
 * Compare current sprint metrics with a previous sprint to compute changes.
 */
export function computeChanges(
  current: CalculatedMetrics,
  previous: CalculatedMetrics
): CalculatedMetrics {
  const pct = (cur: number, prev: number): number | null => {
    if (prev === 0) return null;
    return Math.round(((cur - prev) / prev) * 1000) / 10;
  };

  return {
    ...current,
    cycleTimeChange: pct(current.cycleTime, previous.cycleTime),
    prThroughputChange: pct(current.prThroughput, previous.prThroughput),
    bugChurnChange: pct(current.bugChurnPercent, previous.bugChurnPercent),
    reworkRateChange: pct(current.reworkRatePercent, previous.reworkRatePercent),
  };
}

/**
 * Convert CalculatedMetrics to the SprintMetrics format expected by the LLM service.
 */
export function toSprintMetrics(
  result: SprintAnalysisResult,
  teamName: string,
): import("../lib/llm-service").SprintMetrics {
  return {
    teamName,
    sprintName: result.sprintName,
    periodStart: result.periodStart,
    periodEnd: result.periodEnd,
    cycleTime: result.metrics.cycleTime,
    cycleTimeChange: result.metrics.cycleTimeChange,
    prThroughput: result.metrics.prThroughput,
    prThroughputChange: result.metrics.prThroughputChange,
    bugChurnPercent: result.metrics.bugChurnPercent,
    bugChurnChange: result.metrics.bugChurnChange,
    reworkRatePercent: result.metrics.reworkRatePercent,
    reworkRateChange: result.metrics.reworkRateChange,
    avgPrSize: result.metrics.avgPrSize,
    avgReviewTime: result.metrics.avgReviewTime,
    totalCommits: result.metrics.totalCommits,
    contributors: result.metrics.contributors,
    topContributors: result.metrics.topContributors,
    prsByDay: result.metrics.prsByDay,
  };
}