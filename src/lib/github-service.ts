/**
 * GitHub API Service — server-only wrapper for GitHub OAuth and REST API calls.
 *
 * Uses process.env.GITHUB_CLIENT_ID and process.env.GITHUB_CLIENT_SECRET.
 * If these are not set, returns mock/dev responses for local development.
 *
 * SERVER-ONLY: Do not import from client code.
 */

import { randomUUID } from "node:crypto";

// --- Constants ---

const GITHUB_OAUTH_AUTHORIZE = "https://github.com/login/oauth/authorize";
const GITHUB_OAUTH_TOKEN = "https://github.com/login/oauth/access_token";
const GITHUB_API_BASE = "https://api.github.com";

const SCOPES = ["repo", "read:org", "read:user"];

// --- Types ---

export interface GitHubUser {
  id: number;
  login: string;
  avatar_url: string;
  name: string | null;
  email: string | null;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  fork: boolean;
  default_branch: string;
  updated_at: string;
  owner: { login: string };
}

// --- Helpers ---

function getClientId(): string | undefined {
  return process.env.GITHUB_CLIENT_ID;
}

function getClientSecret(): string | undefined {
  return process.env.GITHUB_CLIENT_SECRET;
}

function getOrigin(): string {
  return process.env.PUBLIC_URL || "https://retroai.ctonew.app";
}

/** Generate a GitHub OAuth authorization URL with CSRF state. */
export function getAuthorizationUrl(state: string): string {
  const clientId = getClientId();
  const redirectUri = `${getOrigin()}/auth/github/callback`;
  const scope = SCOPES.join(",");

  if (!clientId) {
    // Dev mode: return a mock URL that mimics the real flow
    return `${getOrigin()}/auth/github/callback?code=mock_dev_code_${randomUUID().slice(0, 8)}&state=${state}`;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope,
    response_type: "code",
  });

  return `${GITHUB_OAUTH_AUTHORIZE}?${params.toString()}`;
}

/** Exchange an OAuth authorization code for an access token. */
export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string | null;
  token_type: string | null;
  scope: string | null;
  error?: string;
}> {
  const clientId = getClientId();
  const clientSecret = getClientSecret();

  // Dev mode: return mock token
  if (!clientId || !clientSecret) {
    if (code.startsWith("mock_dev_code_")) {
      return {
        access_token: `gho_dev_mock_token_${randomUUID().replace(/-/g, "")}`,
        token_type: "bearer",
        scope: SCOPES.join(","),
      };
    }
    return { access_token: null, token_type: null, scope: null, error: "bad_verification_code" };
  }

  const response = await fetch(GITHUB_OAUTH_TOKEN, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${getOrigin()}/auth/github/callback`,
    }),
  });

  return response.json();
}

/** Fetch the authenticated GitHub user's profile. */
export async function getGitHubUser(accessToken: string): Promise<GitHubUser | null> {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "RetroAI",
      },
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

/** Fetch all repositories the authenticated user has access to. */
export async function getUserRepos(accessToken: string): Promise<GitHubRepo[]> {
  try {
    const repos: GitHubRepo[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 5) {
      const response = await fetch(
        `${GITHUB_API_BASE}/user/repos?per_page=100&page=${page}&sort=updated&type=all`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "RetroAI",
          },
        }
      );

      if (!response.ok) break;

      const pageRepos: GitHubRepo[] = await response.json();
      repos.push(...pageRepos.filter((r) => !r.fork));

      // Check if there are more pages via Link header
      const linkHeader = response.headers.get("Link") || "";
      hasMore = linkHeader.includes('rel="next"');
      page++;
    }

    return repos;
  } catch {
    return [];
  }
}