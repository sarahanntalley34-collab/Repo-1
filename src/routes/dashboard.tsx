import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { validateSession, logoutUser } from "~/lib/server-fns";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

// --- Types ---

type View = "overview" | "reports" | "report-detail" | "settings";

interface RetroReport {
  id: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  team: string;
  status: "healthy" | "needs-attention" | "critical";
  cycleTime: string;
  prThroughput: number;
  bugChurn: string;
  reworkRate: string;
  summary: string;
  insights: { type: "positive" | "warning" | "action"; title: string; description: string }[];
  actionItems: { title: string; owner: string; priority: "High" | "Medium" | "Low"; due: string }[];
}

// --- Mock Data ---

const mockReports: RetroReport[] = [
  {
    id: "r1",
    title: "Sprint #24 — Retrospective",
    periodStart: "Apr 7",
    periodEnd: "Apr 21, 2026",
    team: "Frontend Platform",
    status: "healthy",
    cycleTime: "2.4d",
    prThroughput: 14,
    bugChurn: "8.3%",
    reworkRate: "5.1%",
    summary: "Solid sprint with strong throughput. Cycle time improved 18% thanks to smaller PRs and faster reviews.",
    insights: [
      { type: "positive", title: "Cycle time decreased 18%", description: "Average PR cycle time dropped from 2.9d to 2.4d." },
      { type: "warning", title: "Bug churn increased mid-sprint", description: "A spike in bug-fix PRs on Day 8 suggests the auth refactor introduced regressions." },
      { type: "action", title: "Add integration tests for auth flows", description: "Owner: @frontend-team • Priority: High" },
    ],
    actionItems: [
      { title: "Add integration tests for auth flows", owner: "@frontend-team", priority: "High", due: "Next sprint" },
      { title: "Reduce average PR size to <200 lines", owner: "@all", priority: "Medium", due: "Ongoing" },
    ],
  },
  {
    id: "r2",
    title: "Sprint #23 — Retrospective",
    periodStart: "Mar 24",
    periodEnd: "Apr 4, 2026",
    team: "Frontend Platform",
    status: "needs-attention",
    cycleTime: "2.9d",
    prThroughput: 11,
    bugChurn: "12.1%",
    reworkRate: "7.3%",
    summary: "Cycle time crept up due to larger PRs. Bug churn was elevated.",
    insights: [
      { type: "warning", title: "Cycle time increased 12%", description: "Average PR cycle time increased from 2.6d to 2.9d." },
      { type: "action", title: "Break API migration into smaller PRs", description: "Owner: @backend-team • Priority: High" },
    ],
    actionItems: [
      { title: "Break API migration into smaller PRs", owner: "@backend-team", priority: "High", due: "Sprint 25" },
    ],
  },
  {
    id: "r3",
    title: "Sprint #22 — Retrospective",
    periodStart: "Mar 10",
    periodEnd: "Mar 21, 2026",
    team: "Frontend Platform",
    status: "healthy",
    cycleTime: "2.6d",
    prThroughput: 13,
    bugChurn: "6.8%",
    reworkRate: "4.2%",
    summary: "Another strong sprint. All metrics within target range.",
    insights: [
      { type: "positive", title: "Rework rate at all-time low", description: "Rework rate dropped to 4.2%." },
    ],
    actionItems: [
      { title: "Document the new CI pipeline best practices", owner: "@devops", priority: "Medium", due: "Sprint 24" },
    ],
  },
  {
    id: "r4",
    title: "Sprint #21 — Retrospective",
    periodStart: "Feb 24",
    periodEnd: "Mar 7, 2026",
    team: "Frontend Platform",
    status: "critical",
    cycleTime: "3.8d",
    prThroughput: 8,
    bugChurn: "15.4%",
    reworkRate: "9.8%",
    summary: "Challenging sprint. Major refactor PRs caused bottlenecks.",
    insights: [
      { type: "warning", title: "Cycle time spiked 46%", description: "Average cycle time hit 3.8d." },
      { type: "action", title: "Reduce WIP limit to 2 PRs per developer", description: "Owner: @tech-lead • Priority: High" },
    ],
    actionItems: [
      { title: "Reduce WIP limit to 2 PRs per developer", owner: "@tech-lead", priority: "High", due: "Immediately" },
    ],
  },
];

interface TeamInfo { name: string; repo: string; members: number; plan: string; }
const mockTeam: TeamInfo = { name: "Frontend Platform", repo: "acme-inc/frontend-app", members: 8, plan: "Pro" };

// --- SVG Icon Components ---

function IconLayout({ className = "h-5 w-5" }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>;
}
function IconFileText({ className = "h-5 w-5" }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>;
}
function IconSettings({ className = "h-5 w-5" }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
}
function IconGitHub({ className = "h-5 w-5" }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" /></svg>;
}
function IconArrowRight() { return <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>; }
function IconLogOut() { return <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>; }

function statusColor(status: string) {
  switch (status) {
    case "healthy": return "bg-green-500/10 text-green-400 border-green-500/20";
    case "needs-attention": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "critical": return "bg-red-500/10 text-red-400 border-red-500/20";
    default: return "bg-gray-500/10 text-gray-400 border-gray-500/20";
  }
}
function statusLabel(status: string) {
  switch (status) {
    case "healthy": return "Healthy";
    case "needs-attention": return "Needs Attention";
    case "critical": return "Critical";
    default: return status;
  }
}

// --- Dashboard Component ---

function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  const [view, setView] = useState<View>("overview");
  const [selectedReport, setSelectedReport] = useState<RetroReport | null>(null);

  // Auth check on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("retroai_token");
      if (!token) {
        setChecking(false);
        return;
      }
      try {
        const result = await validateSession({ data: { token } });
        if (result.user) {
          setUser(result.user);
          // Sync stored user data
          localStorage.setItem("retroai_user", JSON.stringify(result.user));
        } else {
          localStorage.removeItem("retroai_token");
          localStorage.removeItem("retroai_user");
        }
      } catch {
        localStorage.removeItem("retroai_token");
        localStorage.removeItem("retroai_user");
      }
      setChecking(false);
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem("retroai_token");
    if (token) {
      await logoutUser({ data: { token } }).catch(() => {});
    }
    localStorage.removeItem("retroai_token");
    localStorage.removeItem("retroai_user");
    window.location.href = "/";
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mx-auto" />
          <p className="mt-4 text-sm text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-100">Please sign in</h1>
          <p className="mt-2 text-gray-400">You need to be signed in to access the dashboard.</p>
          <Link to="/login" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500">
            Go to login
            <IconArrowRight />
          </Link>
        </div>
      </div>
    );
  }

  const handleViewReport = (report: RetroReport) => {
    setSelectedReport(report);
    setView("report-detail");
  };

  const handleBack = () => {
    setSelectedReport(null);
    setView("overview");
  };

  return (
    <div className="flex min-h-screen bg-gray-950">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-gray-800/50 bg-gray-950/95 backdrop-blur-xl lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-gray-800/50 px-6">
          <span className="text-xl font-bold text-indigo-400">RetroAI</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          <button onClick={() => { setView("overview"); setSelectedReport(null); }} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${(view === "overview" || view === "report-detail") ? "bg-indigo-500/10 text-indigo-400" : "text-gray-400 hover:bg-gray-800/60 hover:text-gray-200"}`}>
            <IconLayout /> Overview
          </button>
          <button onClick={() => { setView("reports"); setSelectedReport(null); }} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${view === "reports" ? "bg-indigo-500/10 text-indigo-400" : "text-gray-400 hover:bg-gray-800/60 hover:text-gray-200"}`}>
            <IconFileText /> Retro Reports
            <span className="ml-auto rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-400">{mockReports.length}</span>
          </button>
          <button onClick={() => { setView("settings"); setSelectedReport(null); }} className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${view === "settings" ? "bg-indigo-500/10 text-indigo-400" : "text-gray-400 hover:bg-gray-800/60 hover:text-gray-200"}`}>
            <IconSettings /> Settings
          </button>
        </nav>
        <div className="border-t border-gray-800/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-400">
              {user.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-gray-200">{user.name || "User"}</p>
              <p className="truncate text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition-all hover:bg-gray-800/60 hover:text-gray-200">
            <IconLogOut /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-gray-800/50 bg-gray-950/95 px-4 backdrop-blur-xl lg:hidden">
        <span className="text-lg font-bold text-indigo-400">RetroAI</span>
        <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-gray-200">Sign out</button>
      </div>

      {/* Mobile nav tabs */}
      <div className="sticky top-14 z-20 flex border-b border-gray-800/50 bg-gray-950/95 backdrop-blur-xl lg:hidden">
        {(["overview", "reports", "settings"] as View[]).map((tab) => (
          <button key={tab} onClick={() => { setView(tab); setSelectedReport(null); }}
            className={`flex-1 px-4 py-3 text-center text-sm font-medium transition-colors ${
              (view === tab || (view === "report-detail" && tab === "overview"))
                ? "border-b-2 border-indigo-500 text-indigo-400" : "text-gray-500 hover:text-gray-300"
            }`}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          {view === "overview" && !selectedReport && <OverviewView user={user} report={mockReports[0]} onViewReport={() => handleViewReport(mockReports[0])} />}
          {view === "report-detail" && selectedReport && <ReportDetailView report={selectedReport} onBack={handleBack} />}
          {view === "reports" && !selectedReport && <ReportsListView reports={mockReports} onViewReport={handleViewReport} />}
          {view === "settings" && <SettingsView user={user} team={mockTeam} />}
        </div>
      </main>
    </div>
  );
}

// --- Sub-Views ---

function OverviewView({ user, report, onViewReport }: { user: any; report: RetroReport; onViewReport: () => void }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 sm:text-3xl">Welcome back, {user.name || "there"}!</h1>
        <p className="mt-2 text-gray-400">Here's your latest retro report and team overview.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Reports", value: "4", change: "+2 this month" },
          { label: "Avg. Cycle Time", value: "2.4d", change: "-18% vs last sprint" },
          { label: "PR Throughput", value: "14/sprint", change: "+27% avg" },
          { label: "Team Health", value: "87%", change: "+5% this quarter" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-800/50 bg-gray-900/50 p-5">
            <div className="text-2xl font-bold text-gray-100">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
            <div className="mt-1 text-xs font-medium text-green-400">{stat.change}</div>
          </div>
        ))}
      </div>
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-100">Latest Retro Report</h2>
          <button onClick={onViewReport} className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-400 hover:text-indigo-300">
            View full report <IconArrowRight />
          </button>
        </div>
        <div className="mt-4 rounded-xl border border-gray-800/50 bg-gray-900/50 p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-medium text-gray-300">{report.title}</span>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusColor(report.status)}`}>{statusLabel(report.status)}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { label: "Cycle Time", value: report.cycleTime },
              { label: "PR Throughput", value: `${report.prThroughput}/sprint` },
              { label: "Bug Churn", value: report.bugChurn },
              { label: "Rework Rate", value: report.reworkRate },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <div className="text-lg font-bold text-gray-100">{m.value}</div>
                <div className="text-xs text-gray-500">{m.label}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-gray-400">{report.summary}</p>
        </div>
      </div>
    </div>
  );
}

function ReportsListView({ reports, onViewReport }: { reports: RetroReport[]; onViewReport: (r: RetroReport) => void }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 sm:text-3xl">Retro Reports</h1>
        <p className="mt-2 text-gray-400">Browse all your past sprint retrospectives.</p>
      </div>
      <div className="space-y-4">
        {reports.map((report) => (
          <button key={report.id} onClick={() => onViewReport(report)}
            className="group w-full text-left rounded-xl border border-gray-800/50 bg-gray-900/50 p-5 transition-all hover:border-gray-700/50 hover:bg-gray-800/70">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="truncate text-base font-semibold text-gray-100 group-hover:text-indigo-400">{report.title}</h3>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusColor(report.status)}`}>{statusLabel(report.status)}</span>
                </div>
                <p className="mt-1 text-sm text-gray-500">{report.team} · {report.periodStart} – {report.periodEnd}</p>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center"><div className="font-medium text-gray-200">{report.cycleTime}</div><div className="text-xs text-gray-500">Cycle</div></div>
                <div className="text-center"><div className="font-medium text-gray-200">{report.prThroughput}</div><div className="text-xs text-gray-500">PRs</div></div>
                <div className="text-center"><div className="font-medium text-gray-200">{report.bugChurn}</div><div className="text-xs text-gray-500">Churn</div></div>
                <IconArrowRight />
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ReportDetailView({ report, onBack }: { report: RetroReport; onBack: () => void }) {
  return (
    <div className="space-y-8">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-200">
        <svg className="h-4 w-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
        Back to reports
      </button>
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-100 sm:text-3xl">{report.title}</h1>
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColor(report.status)}`}>{statusLabel(report.status)}</span>
        </div>
        <p className="mt-1 text-sm text-gray-500">{report.team} · {report.periodStart} – {report.periodEnd}</p>
      </div>
      <div className="rounded-xl border border-gray-800/50 bg-gray-900/50 p-5">
        <h2 className="text-sm font-semibold text-gray-200">Summary</h2>
        <p className="mt-2 text-sm leading-relaxed text-gray-400">{report.summary}</p>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-100">Insights</h2>
        <div className="mt-4 space-y-3">
          {report.insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl border border-gray-800/50 bg-gray-900/50 p-4">
              <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold ${
                insight.type === "positive" ? "bg-green-500/10 text-green-400" :
                insight.type === "warning" ? "bg-amber-500/10 text-amber-400" : "bg-indigo-500/10 text-indigo-400"
              }`}>{insight.type === "positive" ? "↑" : insight.type === "warning" ? "!" : "→"}</div>
              <div><div className="text-sm font-medium text-gray-200">{insight.title}</div><div className="mt-0.5 text-xs text-gray-500">{insight.description}</div></div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-100">Action Items</h2>
        <div className="mt-4 space-y-3">
          {report.actionItems.map((item, i) => (
            <div key={i} className="rounded-xl border border-gray-800/50 bg-gray-900/50 p-4">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
                  item.priority === "High" ? "bg-red-500/10 text-red-400" :
                  item.priority === "Medium" ? "bg-amber-500/10 text-amber-400" : "bg-gray-500/10 text-gray-400"
                }`}>{item.priority === "High" ? "!" : item.priority === "Medium" ? "•" : "·"}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-200">{item.title}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                    <span>👤 {item.owner}</span>
                    <span>📅 Due: {item.due}</span>
                    <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                      item.priority === "High" ? "bg-red-500/10 text-red-400" :
                      item.priority === "Medium" ? "bg-amber-500/10 text-amber-400" : "bg-gray-500/10 text-gray-400"
                    }`}>{item.priority}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsView({ user, team }: { user: any; team: TeamInfo }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-100 sm:text-3xl">Settings</h1>
        <p className="mt-2 text-gray-400">Manage your team, GitHub connection, and billing.</p>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-100">GitHub Connection</h2>
        <div className="mt-4 rounded-xl border border-gray-800/50 bg-gray-900/50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <IconGitHub className="h-6 w-6 text-gray-400" />
              <div><h3 className="font-medium text-gray-200">Connect GitHub</h3><p className="text-sm text-gray-500">Grant RetroAI read-only access to your repositories.</p></div>
            </div>
            <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500">Connect <IconArrowRight /></button>
          </div>
          <div className="mt-4 rounded-lg border border-gray-800/50 bg-gray-800/30 p-3 text-sm text-gray-400">
            ⚠️ Not connected yet. Connect your GitHub account to start generating retro reports.
          </div>
        </div>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-100">Team Configuration</h2>
        <div className="mt-4 rounded-xl border border-gray-800/50 bg-gray-900/50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div><div className="text-sm font-medium text-gray-200">Team Name</div><div className="text-sm text-gray-500">{team.name}</div></div>
            <button className="rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-gray-600 hover:text-gray-100">Edit</button>
          </div>
          <div className="border-t border-gray-800/50" />
          <div className="flex items-center justify-between">
            <div><div className="text-sm font-medium text-gray-200">Repository</div><div className="text-sm text-gray-500">{team.repo}</div></div>
            <button className="rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-gray-600 hover:text-gray-100">Change</button>
          </div>
          <div className="border-t border-gray-800/50" />
          <div className="flex items-center justify-between">
            <div><div className="text-sm font-medium text-gray-200">Team Members</div><div className="text-sm text-gray-500">{team.members} members</div></div>
            <button className="rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-gray-600 hover:text-gray-100">Manage</button>
          </div>
        </div>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-100">Billing</h2>
        <div className="mt-4 rounded-xl border border-gray-800/50 bg-gray-900/50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-200">Current Plan</h3>
                <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400">{team.plan}</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">${team.plan === "Pro" ? "49" : "0"}/month · {team.plan === "Free" ? "1 retro/month" : "Unlimited retros"}</p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800/50 px-5 py-2.5 text-sm font-semibold text-gray-300 hover:border-gray-600 hover:text-gray-100">
              {team.plan === "Free" ? "Upgrade to Pro" : "Manage Subscription"} <IconArrowRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}