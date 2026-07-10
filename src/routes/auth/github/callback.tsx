/**
 * GitHub OAuth Callback Route — handles the redirect back from GitHub after
 * the user authorizes RetroAI. On mount, reads the OAuth code and state from
 * the URL, exchanges them for an access token via a server function, and
 * redirects the user to the dashboard on success.
 */
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { handleGitHubCallback } from "~/lib/server-fns";

export const Route = createFileRoute("/auth/github/callback")({
  component: GitHubCallbackPage,
});

function GitHubCallbackPage() {
  const search = useSearch({ from: Route.id });
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const processCallback = async () => {
      const params = search as { code?: string; state?: string; error?: string };

      // Check if GitHub returned an error (user denied access)
      if (params.error) {
        setStatus("error");
        setErrorMessage("GitHub authorization was denied. Please try again.");
        return;
      }

      if (!params.code || !params.state) {
        setStatus("error");
        setErrorMessage("Invalid callback: missing authorization code or state parameter.");
        return;
      }

      // Get user's auth token from localStorage
      const token = localStorage.getItem("retroai_token");
      if (!token) {
        setStatus("error");
        setErrorMessage("You need to be signed in to connect GitHub. Redirecting to login...");
        setTimeout(() => navigate({ to: "/login" }), 2000);
        return;
      }

      try {
        // First validate the session to get the user ID
        const { validateSession } = await import("~/lib/server-fns");
        const sessionResult = await validateSession({ data: { token } });

        if (!sessionResult.user) {
          setStatus("error");
          setErrorMessage("Session expired. Please sign in again.");
          setTimeout(() => navigate({ to: "/login" }), 2000);
          return;
        }

        // Exchange the code for a GitHub token and store the connection
        const result = await handleGitHubCallback({
          data: {
            code: params.code,
            state: params.state,
            userId: sessionResult.user.id,
          },
        });

        if ("error" in result) {
          setStatus("error");
          setErrorMessage(result.error);
          return;
        }

        // Store GitHub user info in localStorage for quick lookup
        localStorage.setItem("retroai_github_user", JSON.stringify(result.githubUser));
        localStorage.setItem("retroai_github_connected", "true");

        setStatus("success");

        // Redirect to dashboard after a brief pause
        setTimeout(() => {
          navigate({ to: "/dashboard", search: { github: "connected" } as any });
        }, 1500);
      } catch (err) {
        setStatus("error");
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    };

    processCallback();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="w-full max-w-md rounded-2xl border border-gray-800/50 bg-gray-900/50 p-8 text-center shadow-xl">
        {status === "processing" && (
          <div className="space-y-4">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <h1 className="text-xl font-bold text-gray-100">Connecting GitHub...</h1>
            <p className="text-sm text-gray-400">
              Exchanging authorization code and fetching your repositories.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
              <svg className="h-7 w-7 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-green-400">GitHub Connected!</h1>
            <p className="text-sm text-gray-400">
              Your GitHub account has been successfully connected. Redirecting to dashboard...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
              <svg className="h-7 w-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-red-400">Connection Failed</h1>
            <p className="text-sm text-gray-400">{errorMessage}</p>
            <button
              onClick={() => navigate({ to: "/dashboard" })}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}