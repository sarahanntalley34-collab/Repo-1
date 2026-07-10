import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const userStr = typeof window !== "undefined" ? localStorage.getItem("retroai_user") : null;
  const user = userStr ? JSON.parse(userStr) : null;

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Please sign in</h1>
          <Link to="/login" className="mt-4 inline-block text-indigo-600 hover:text-indigo-500">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Dashboard Nav */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              RetroAI
            </span>
            <span className="ml-6 text-sm font-medium text-gray-500">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">{user?.email}</span>
            <button
              onClick={() => {
                localStorage.removeItem("retroai_token");
                localStorage.removeItem("retroai_user");
                window.location.href = "/";
              }}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              Sign out
            </button>
          </div>
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Welcome, {user?.name || "there"}!</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Your retro dashboard. Connect GitHub to start generating reports.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 p-6 dark:border-gray-800">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold">Connect GitHub</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Link your repos to start analyzing sprint data.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 p-6 dark:border-gray-800">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-950">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold">Generate Retro</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Run an AI-powered analysis of your last sprint.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 p-6 dark:border-gray-800">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
                <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold">View Reports</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Browse past retro reports and track improvements.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}