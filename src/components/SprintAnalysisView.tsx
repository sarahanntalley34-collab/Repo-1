/**
 * SprintAnalysisView — Full Run Sprint Analysis UI for the dashboard.
 * Provides repo selector, sprint name/date inputs, analysis button,
 * results display with metrics cards, and sprint history.
 */
import { useState, useEffect } from "react";
import { runSprintAnalysis, getSprintHistory, getGitHubConnection, generateRetroReport } from "~/lib/server-fns";

// --- Types ---

interface SprintMetrics {
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
  prsByDay: { day: string; count: number }[];
}

interface AnalysisResult {
  sprintId: string;
  metrics: SprintMetrics;
  rawPRs: number;
  rawCommits: number;
  comparedToPrevious: boolean;
  report: {
    id: string;
    title: string;
    status: string;
    summary: string;
    insights: any[];
    actionItems: any[];
  } | null;
}

interface HistoryItem {
  id: string;
  sprint_name: string;
  repo_owner: string;
  repo_name: string;
  period_start: string;
  period_end: string;
  cycle_time: number;
  cycle_time_change: number | null;
  pr_throughput: number;
  pr_throughput_change: number | null;
  bug_churn_pct: number;
  bug_churn_change: number | null;
  rework_rate_pct: number;
  rework_rate_change: number | null;
  created_at: string;
  report_id: string | null;
}

// --- Icons ---

function IconActivity() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" /></svg>;
}

function IconChart() {
  return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>;
}

function IconRefresh() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" /></svg>;
}

function IconSparkles() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>;
}

function IconArrowRight() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>;
}

function IconCheck() {
  return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>;
}

// --- Helpers ---

function fmt(num: number, suffix = ""): string {
  if (num === 0) return "—";
  return num.toFixed(1).replace(/\.0$/, "") + suffix;
}

function changeBadge(change: number | null, suffix = ""): { text: string; color: string } {
  if (change === null) return { text: "—", color: "text-gray-500" };
  const sign = change >= 0 ? "↑" : "↓";
  // For cycle time and rework, down is good (improvement)
  const isGood = change < 0;
  return {
    text: `${sign} ${Math.abs(change).toFixed(1)}${suffix}`,
    color: isGood ? "text-green-400" : "text-red-400",
  };
}

interface SprintAnalysisViewProps {
  userId: string;
  teams: { id: string; name: string }[];
  user: any;
  onReportCreated?: (report: any) => void;
  onNavigateToReport?: (report: any) => void;
}

export default function SprintAnalysisView({
  userId,
  teams,
  user,
  onReportCreated,
  onNavigateToReport,
}: SprintAnalysisViewProps) {
  // Connection state
  const [connectedRepos, setConnectedRepos] = useState<{ name: string; owner: string; full_name: string }[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);

  // Form state
  const [selectedRepo, setSelectedRepo] = useState("");
  const [sprintName, setSprintName] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");

  // Retro report generation
  const [generatingReport, setGeneratingReport] = useState(false);

  // History
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Load connected repos on mount
  useEffect(() => {
    const loadRepos = async () => {
      setLoadingRepos(true);
      try {
        const conn = await getGitHubConnection({ data: { userId } });
        if (conn.connected && conn.repos) {
          const repos = conn.repos.map((r: any) => {
            const parts = r.name.split("/");
            return {
              full_name: r.name,
              owner: parts[0],
              name: parts[1] || parts[0],
              ...r,
            };
          });
          setConnectedRepos(repos);
          if (repos.length > 0) setSelectedRepo(repos[0].full_name);
        }
      } catch {}
      setLoadingRepos(false);
    };
    loadRepos();
  }, [userId]);

  // Load sprint history
  useEffect(() => {
    const loadHistory = async () => {
      if (teams.length === 0) return;
      setLoadingHistory(true);
      try {
        const items = await getSprintHistory({ data: { teamId: teams[0].id } });
        setHistory(Array.isArray(items) ? items : []);
      } catch {
        setHistory([]);
      }
      setLoadingHistory(false);
    };
    loadHistory();
    // Also poll every 30s
    const interval = setInterval(loadHistory, 30000);
    return () => clearInterval(interval);
  }, [teams]);

  // Set default dates
  useEffect(() => {
    if (!periodEnd) {
      const now = new Date();
      setPeriodEnd(now.toISOString().split("T")[0]);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      setPeriodStart(twoWeeksAgo.toISOString().split("T")[0]);
    }
  }, []);

  const handleRunAnalysis = async () => {
    if (!selectedRepo || !sprintName || !periodStart || !periodEnd || teams.length === 0) {
      setError("Please fill in all fields and ensure a team exists.");
      return;
    }

    const parts = selectedRepo.split("/");
    const repoOwner = parts[0];
    const repoName = parts[1] || parts[0];

    setAnalyzing(true);
    setError("");
    setResult(null);
    try {
      const res = await runSprintAnalysis({
        data: {
          userId,
          teamId: teams[0].id,
          repoOwner,
          repoName,
          sprintName,
          periodStart,
          periodEnd,
          generateReport: false,
        },
      });
      setResult(res as unknown as AnalysisResult);
      // Refresh history
      const items = await getSprintHistory({ data: { teamId: teams[0].id } });
      setHistory(Array.isArray(items) ? items : []);
    } catch (err: any) {
      setError(err?.message || "Analysis failed. Check the GitHub repo name and try again.");
    }
    setAnalyzing(false);
  };

  const handleGenerateReport = async () => {
    if (!result || teams.length === 0) return;
    setGeneratingReport(true);
    try {
      const parts = selectedRepo.split("/");
      const res = await runSprintAnalysis({
        data: {
          userId,
          teamId: teams[0].id,
          repoOwner: parts[0],
          repoName: parts[1] || parts[0],
          sprintName,
          periodStart,
          periodEnd,
          generateReport: true,
        },
      });
      const analysisResult = res as unknown as AnalysisResult;
      setResult(analysisResult);
      if (analysisResult.report) {
        onReportCreated?.(analysisResult.report);
        onNavigateToReport?.(analysisResult.report);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to generate retro report.");
    }
    setGeneratingReport(false);
  };

  const handleQuickGenerate = async () => {
    if (teams.length === 0) return;
    setAnalyzing(true);
    setError("");
    setResult(null);
    try {
      // Use mock data from metrics engine (pass empty strings to trigger fallback)
      const res = await runSprintAnalysis({
        data: {
          userId,
          teamId: teams[0].id,
          repoOwner: "demo",
          repoName: "demo-repo",
          sprintName: sprintName || `Sprint ${history.length + 1}`,
          periodStart: periodStart || new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          periodEnd: periodEnd || new Date().toISOString().split("T")[0],
          generateReport: true,
        },
      });
      const analysisResult = res as unknown as AnalysisResult;
      setResult(analysisResult);
      if (analysisResult.report) {
        onReportCreated?.(analysisResult.report);
        onNavigateToReport?.(analysisResult.report);
      }
    } catch (err: any) {
      setError(err?.message || "Quick generate failed.");
    }
    setAnalyzing(false);
  };

  const getSelectedRepoObj = () => {
    return connectedRepos.find((r) => r.full_name === selectedRepo);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 sm:text-3xl">Sprint Analysis</h1>
          <p className="mt-2 text-gray-400">Analyze your team's sprint data from GitHub and generate retrospectives.</p>
        </div>
        {!connectedRepos.length && !loadingRepos && (
          <button
            onClick={handleQuickGenerate}
            disabled={analyzing}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 disabled:opacity-50"
          >
            <IconSparkles />
            {analyzing ? "Generating..." : "Quick Generate (Demo)"}
          </button>
        )}
      </div>

      {/* Analysis Form Card */}
      <div className="rounded-xl border border-gray-800/50 bg-gray-900/50 p-6">
        <h2 className="text-lg font-semibold text-gray-100">Run New Analysis</h2>
        <p className="mt-1 text-sm text-gray-500">Select a repository and sprint period to analyze.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Repo Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Repository</label>
            {loadingRepos ? (
              <div className="h-10 animate-pulse rounded-lg bg-gray-800/50" />
            ) : connectedRepos.length > 0 ? (
              <select
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {connectedRepos.map((r) => (
                  <option key={r.full_name} value={r.full_name}>{r.full_name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
                placeholder="owner/repo (e.g. acme-inc/app)"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            )}
          </div>

          {/* Sprint Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Sprint Name</label>
            <input
              type="text"
              value={sprintName}
              onChange={(e) => setSprintName(e.target.value)}
              placeholder='e.g. "Sprint #26"'
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Start Date</label>
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">End Date</label>
            <input
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={handleRunAnalysis}
            disabled={analyzing || !sprintName}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Analyzing...
              </>
            ) : (
              <>
                <IconActivity /> Run Analysis
              </>
            )}
          </button>

          {!connectedRepos.length && (
            <button
              onClick={handleQuickGenerate}
              disabled={analyzing}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800/50 px-5 py-2.5 text-sm font-semibold text-gray-300 hover:border-gray-600 hover:text-gray-100 disabled:opacity-50"
            >
              <IconSparkles />
              Quick Generate (Demo)
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Analysis Results */}
      {result && (
        <div className="rounded-xl border border-gray-800/50 bg-gray-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                <IconCheck />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-100">Analysis Results</h2>
                <p className="text-sm text-gray-500">
                  {result.rawPRs} PRs · {result.rawCommits} commits
                  {result.comparedToPrevious && <span className="text-indigo-400"> · Compared to previous sprint</span>}
                </p>
              </div>
            </div>
            <button
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 disabled:opacity-50"
            >
              <IconSparkles />
              {generatingReport ? "Generating Report..." : "Generate Retro Report"}
            </button>
          </div>

          {/* Metrics Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Cycle Time */}
            <div className="rounded-xl border border-gray-800/50 bg-gray-900/70 p-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cycle Time</div>
              <div className="mt-1 text-2xl font-bold text-gray-100">{fmt(result.metrics.cycleTime, "d")}</div>
              <div className={`mt-1 text-xs font-medium ${changeBadge(result.metrics.cycleTimeChange, "d").color}`}>
                {changeBadge(result.metrics.cycleTimeChange, "d").text}
              </div>
            </div>

            {/* PR Throughput */}
            <div className="rounded-xl border border-gray-800/50 bg-gray-900/70 p-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">PR Throughput</div>
              <div className="mt-1 text-2xl font-bold text-gray-100">{result.metrics.prThroughput}</div>
              <div className={`mt-1 text-xs font-medium ${changeBadge(result.metrics.prThroughputChange, "%").color}`}>
                {changeBadge(result.metrics.prThroughputChange, "%").text}
              </div>
            </div>

            {/* Bug Churn */}
            <div className="rounded-xl border border-gray-800/50 bg-gray-900/70 p-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bug Churn</div>
              <div className="mt-1 text-2xl font-bold text-gray-100">{fmt(result.metrics.bugChurnPercent, "%")}</div>
              <div className={`mt-1 text-xs font-medium ${changeBadge(result.metrics.bugChurnChange, "%").color}`}>
                {changeBadge(result.metrics.bugChurnChange, "%").text}
              </div>
            </div>

            {/* Rework Rate */}
            <div className="rounded-xl border border-gray-800/50 bg-gray-900/70 p-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Rework Rate</div>
              <div className="mt-1 text-2xl font-bold text-gray-100">{fmt(result.metrics.reworkRatePercent, "%")}</div>
              <div className={`mt-1 text-xs font-medium ${changeBadge(result.metrics.reworkRateChange, "%").color}`}>
                {changeBadge(result.metrics.reworkRateChange, "%").text}
              </div>
            </div>

            {/* Avg PR Size */}
            <div className="rounded-xl border border-gray-800/50 bg-gray-900/70 p-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg PR Size</div>
              <div className="mt-1 text-2xl font-bold text-gray-100">{fmt(result.metrics.avgPrSize, " lines")}</div>
            </div>

            {/* Review Time */}
            <div className="rounded-xl border border-gray-800/50 bg-gray-900/70 p-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg Review Time</div>
              <div className="mt-1 text-2xl font-bold text-gray-100">{fmt(result.metrics.avgReviewTime, "h")}</div>
            </div>

            {/* Total Commits */}
            <div className="rounded-xl border border-gray-800/50 bg-gray-900/70 p-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Commits</div>
              <div className="mt-1 text-2xl font-bold text-gray-100">{result.metrics.totalCommits}</div>
            </div>

            {/* Contributors */}
            <div className="rounded-xl border border-gray-800/50 bg-gray-900/70 p-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contributors</div>
              <div className="mt-1 text-2xl font-bold text-gray-100">{result.metrics.contributors}</div>
            </div>
          </div>

          {/* Top Contributors */}
          {result.metrics.topContributors.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-gray-500">Top contributors:</span>
              {result.metrics.topContributors.map((name) => (
                <span key={name} className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400">
                  @{name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sprint History */}
      <div>
        <h2 className="text-lg font-semibold text-gray-100">Sprint History</h2>
        {loadingHistory ? (
          <div className="mt-4 flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : history.length === 0 ? (
          <div className="mt-4 rounded-xl border border-gray-800/50 bg-gray-900/50 p-8 text-center">
            <IconChart />
            <h3 className="mt-3 text-base font-medium text-gray-300">No sprints analyzed yet</h3>
            <p className="mt-1 text-sm text-gray-500">Run your first analysis above to see sprint history here.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {history.map((sprint) => (
              <div key={sprint.id} className="group rounded-xl border border-gray-800/50 bg-gray-900/50 p-4 transition-all hover:border-gray-700/50">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-100">{sprint.sprint_name}</h3>
                      <span className="text-xs text-gray-500">{sprint.repo_owner}/{sprint.repo_name}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {sprint.period_start} – {sprint.period_end}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-center">
                      <div className="font-medium text-gray-200">{fmt(sprint.cycle_time, "d")}</div>
                      <div className="text-gray-500">Cycle</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-200">{sprint.pr_throughput}</div>
                      <div className="text-gray-500">PRs</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-200">{fmt(sprint.bug_churn_pct, "%")}</div>
                      <div className="text-gray-500">Churn</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-200">{fmt(sprint.rework_rate_pct, "%")}</div>
                      <div className="text-gray-500">Rework</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-200">{sprint.total_commits}</div>
                      <div className="text-gray-500">Commits</div>
                    </div>
                    <IconArrowRight />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}