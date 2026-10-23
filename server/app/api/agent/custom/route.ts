import { jsonError, passThrough } from "../../_lib/browserUse";

/**
 * POST /api/agent/custom
 * Proxies a run request to the user's own agent backend.
 *
 * The client sends only the non-secret parts of the provider config; the key is
 * injected here from CUSTOM_AGENT_API_KEY so it never appears in the browser.
 *
 * Body: { config: { baseUrl, authHeader, authPrefix, responseMode }, payload: {...} }
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";

const ALLOWLIST = (process.env.CUSTOM_AGENT_ALLOWED_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const cfg = body?.config ?? {};
  // Prefer the server-configured base URL so the client never needs to send one.
  const baseUrl = String(process.env.CUSTOM_AGENT_BASE_URL ?? cfg.baseUrl ?? "").trim();
  if (!baseUrl) return jsonError("Custom provider `baseUrl` is required.", 400);

  let target: URL;
  try {
    target = new URL(baseUrl);
  } catch {
    return jsonError("Custom provider `baseUrl` is not a valid URL.", 400);
  }
  if (target.protocol !== "https:" && target.hostname !== "localhost") {
    return jsonError("Custom provider endpoints must use HTTPS.", 400);
  }
  if (ALLOWLIST.length && !ALLOWLIST.includes(target.hostname)) {
    return jsonError(`Host ${target.hostname} is not in CUSTOM_AGENT_ALLOWED_HOSTS.`, 403);
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = process.env.CUSTOM_AGENT_API_KEY;
  if (key) {
    const name = String(cfg.authHeader || "Authorization");
    const prefix = String(cfg.authPrefix ?? "Bearer").trim();
    headers[name] = prefix ? `${prefix} ${key}` : key;
  }
  if (cfg.responseMode === "sse") headers.Accept = "text/event-stream";

  try {
    const upstream = await fetch(target.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify(body?.payload ?? {}),
    });
    console.info(`[agent/custom] ${target.hostname} -> ${upstream.status}`);
    return passThrough(upstream);
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Custom backend unreachable.", 502);
  }
}
