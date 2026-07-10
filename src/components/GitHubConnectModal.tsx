/**
 * GitHubConnectModal — A reusable modal component for the GitHub OAuth flow.
 * Uses real server functions for connection management and repo access.
 * Designed to match the RetroAI dark-mode brand.
 */

import { useState, useEffect, useCallback } from "react";
import {
  getGitHubAuthUrl,
  getGitHubConnection,
  disconnectGitHub,
  fetchGitHubRepos,
  saveSelectedRepos,
} from "~/lib/server-fns";

interface GitHubRepo {
  name: string;
  private: boolean;
  description?: string;
  selected?: boolean;
}

interface GitHubConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onStatusChange?: (connected: boolean, username?: string) => void;
}

export default function GitHubConnectModal({
  isOpen,
  onClose,
  userId,
  onStatusChange,
}: GitHubConnectModalProps) {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [githubLogin, setGitHubLogin] = useState("");
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Load connection state
  const loadConnection = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getGitHubConnection({ data: { userId } });
      if (result.connected && result.repos) {
        setConnected(true);
        // Try to get the login name from stored data or localStorage
        const storedUser = localStorage.getItem("retroai_github_user");
        if (storedUser) {
          try {
            const ghUser = JSON.parse(storedUser);
            setGitHubLogin(ghUser.login);
          } catch {}
        }
        setRepos(result.repos.map((r: any) => ({ ...r, selected: r.selected ?? false })));
      } else {
        setConnected(false);
        setRepos([]);
      }
    } catch {
      setConnected(false);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (isOpen) loadConnection();
  }, [isOpen, loadConnection]);

  const handleConnect = async () => {
    try {
      const result = await getGitHubAuthUrl({ data: { userId } });
      if (result.url) {
        // Store the current page so we can return after OAuth
        localStorage.setItem("retroai_oauth_return", window.location.pathname);
        // Redirect to GitHub authorization
        window.location.href = result.url;
      }
    } catch (err) {
      console.error("Failed to get GitHub auth URL:", err);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectGitHub({ data: { userId } });
      setConnected(false);
      setRepos([]);
      setGitHubLogin("");
      localStorage.removeItem("retroai_github_user");
      localStorage.removeItem("retroai_github_connected");
      onStatusChange?.(false);
    } catch (err) {
      console.error("Failed to disconnect GitHub:", err);
    }
    setDisconnecting(false);
  };

  const handleRefreshRepos = async () => {
    setSyncing(true);
    try {
      const result = await fetchGitHubRepos({ data: { userId } });
      if (result.repos) {
        setRepos(result.repos.map((r: any) => ({ ...r, selected: false })));
      }
    } catch (err) {
      console.error("Failed to fetch repos:", err);
    }
    setSyncing(false);
  };

  const handleToggleRepo = (name: string) => {
    setRepos((prev) =>
      prev.map((r) => (r.name === name ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleSaveSelection = async () => {
    const selectedRepos = repos.filter((r) => r.selected).map((r) => r.name);
    try {
      await saveSelectedRepos({ data: { userId, selectedRepos } });
      onStatusChange?.(true, githubLogin);
      onClose();
    } catch (err) {
      console.error("Failed to save repo selection:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl border border-gray-800/50 bg-gray-950 p-6 shadow-2xl shadow-indigo-500/5 animate-fade-in">
        {/* Close button */}
        <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-gray-800">
            <svg className="h-7 w-7 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-bold text-gray-100">Connect GitHub</h2>
          <p className="mt-2 text-sm text-gray-400">
            {loading
              ? "Checking connection..."
              : connected
                ? `Connected as @${githubLogin || "GitHub user"}`
                : "Grant RetroAI read-only access to your repositories."}
          </p>
        </div>

        {loading ? (
          <div className="mt-8 flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : connected ? (
          /* Connected state */
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                  <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-green-400">Connected</p>
                  <p className="text-sm text-green-400/70">@{githubLogin || "GitHub user"}</p>
                </div>
              </div>
            </div>

            {/* Repo list */}
            {repos.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-200">Select repositories to analyze</h3>
                  <button
                    onClick={handleRefreshRepos}
                    disabled={syncing}
                    className="text-xs font-medium text-indigo-400 hover:text-indigo-300 disabled:text-gray-600"
                  >
                    {syncing ? "Syncing..." : "Refresh"}
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {repos.map((repo) => (
                    <label key={repo.name} className="flex items-center gap-3 rounded-lg border border-gray-800/50 bg-gray-900/50 p-3 cursor-pointer transition-colors hover:border-gray-700/50">
                      <input
                        type="checkbox"
                        checked={repo.selected ?? false}
                        onChange={() => handleToggleRepo(repo.name)}
                        className="h-4 w-4 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-950"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-200 truncate">{repo.name}</span>
                          {repo.private && (
                            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-400">Private</span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-800/50 bg-gray-900/50 p-4 text-center text-sm text-gray-500">
                No repositories found.
                <button onClick={handleRefreshRepos} className="ml-2 text-indigo-400 hover:text-indigo-300">
                  Refresh
                </button>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={handleSaveSelection} className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-indigo-500">
                Save Selection
              </button>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex-1 rounded-xl bg-red-600/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-600/20 disabled:opacity-50"
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          </div>
        ) : (
          /* Disconnected state */
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-gray-800/50 bg-gray-900/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800">
                  <svg className="h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">Not connected</p>
                  <p className="text-xs text-gray-500">Connect to start analyzing your repos</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center leading-relaxed">
              We'll only request read-only access to your public and selected repositories.
              We never modify your code or access private data without permission.
            </p>

            <button onClick={handleConnect} className="flex w-full items-center justify-center gap-3 rounded-xl bg-gray-800 px-6 py-3.5 text-sm font-semibold text-gray-100 transition-all hover:bg-gray-700 border border-gray-700">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              Connect GitHub Account
            </button>

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 rounded-xl border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-sm font-medium text-gray-300 transition-colors hover:border-gray-600 hover:text-gray-100">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * GitHubConnectButton — A small inline button that opens the connect modal.
 * Use this in the dashboard settings page. Loads real connection state.
 */
export function GitHubConnectButton({ userId, connected: initialConnected, username }: {
  userId: string;
  connected: boolean;
  username?: string;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(initialConnected);
  const [ghUsername, setGhUsername] = useState(username || "");

  // Check real connection status on mount and when localStorage changes
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const result = await getGitHubConnection({ data: { userId } });
        setIsConnected(result.connected);
        if (result.connected) {
          const storedUser = localStorage.getItem("retroai_github_user");
          if (storedUser) {
            try {
              const ghUser = JSON.parse(storedUser);
              setGhUsername(ghUser.login || "");
            } catch {}
          }
        }
      } catch {}
    };
    checkConnection();

    // Listen for OAuth callback completion
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "retroai_github_connected" || e.key === "retroai_github_user") {
        checkConnection();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [userId]);

  // Also re-check when the modal closes (user might have connected in another tab)
  const handleModalClose = () => {
    setModalOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-400/30"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
        {isConnected ? `Connected${ghUsername ? ` (${ghUsername})` : ""}` : "Connect GitHub"}
      </button>

      <GitHubConnectModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        userId={userId}
        onStatusChange={(connected, username) => {
          setIsConnected(connected);
          if (username) setGhUsername(username);
        }}
      />
    </>
  );
}