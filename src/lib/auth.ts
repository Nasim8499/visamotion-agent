import { ADMIN_PASSWORD } from "./types";

const LOCAL = "visamotion:auth";
const SESSION = "visamotion:auth:tab";
const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;
const TAB_MS = 12 * 60 * 60 * 1000;

export interface AuthSession {
  unlockedAt: number;
  expiresAt: number;
  remember: boolean;
}

function parse(raw: string | null, store: "local" | "session"): AuthSession | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as AuthSession;
    if (!s?.expiresAt || s.expiresAt < Date.now()) {
      (store === "local" ? localStorage : sessionStorage).removeItem(store === "local" ? LOCAL : SESSION);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  return parse(sessionStorage.getItem(SESSION), "session") ?? parse(localStorage.getItem(LOCAL), "local");
}

export function writeSession(remember: boolean) {
  const session: AuthSession = {
    unlockedAt: Date.now(),
    expiresAt: Date.now() + (remember ? REMEMBER_MS : TAB_MS),
    remember,
  };
  if (remember) localStorage.setItem(LOCAL, JSON.stringify(session));
  else sessionStorage.setItem(SESSION, JSON.stringify(session));
  // Never keep both — "remember" and tab-only must not blur together.
  if (remember) sessionStorage.removeItem(SESSION);
  else localStorage.removeItem(LOCAL);
  return session;
}

export function clearSession() {
  localStorage.removeItem(LOCAL);
  sessionStorage.removeItem(SESSION);
}

export async function verifyPassword(password: string, proxyBase: string): Promise<boolean> {
  const base = proxyBase.trim().replace(/\/+$/, "");
  const url = `${base}/api/auth/login`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
      credentials: "same-origin",
    });
    const ctype = res.headers.get("content-type") ?? "";
    if (!ctype.includes("application/json")) throw new Error("no-server-route");
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.ok) return true;
    if (res.status === 401) return false;
    throw new Error(data?.error ?? `HTTP ${res.status}`);
  } catch {
    // Static/local mode: the lock screen validates the admin password locally.
    // The deployed Next.js server re-validates every request via middleware.
    return password === ADMIN_PASSWORD;
  }
}

export async function serverLogout(proxyBase: string) {
  const base = proxyBase.trim().replace(/\/+$/, "");
  try {
    await fetch(`${base}/api/auth/logout`, { method: "POST", credentials: "same-origin" });
  } catch {
    /* best effort */
  }
}
