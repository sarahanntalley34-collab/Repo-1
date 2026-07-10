/**
 * RetroAI server functions — all DB imports are lazy to prevent client bundling.
 */
import { createServerFn } from "@tanstack/react-start";
import { randomUUID } from "node:crypto";

function simpleHash(pw: string): string {
  let hash = 0;
  for (let i = 0; i < pw.length; i++) {
    const char = pw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `hash_${Math.abs(hash)}`;
}

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
    const hash = simpleHash(data.password);
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
    const hash = simpleHash(data.password);
    if (user.password_hash !== hash) return { error: "Invalid email or password" };
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await createSession(randomUUID(), user.id, token, expiresAt);
    return { token, user: { id: user.id, email: user.email, name: user.name, plan: user.plan } };
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