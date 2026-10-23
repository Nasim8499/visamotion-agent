/**
 * Shared Browser Use Cloud API v4 helpers.
 *
 * SECURITY: the API key is read from the server environment only. It is never
 * returned to the client and never written to logs in full.
 */
export const BROWSER_USE_BASE = process.env.BROWSER_USE_BASE ?? "https://api.browser-use.com/api/v4";

export class ConfigError extends Error {}

export function apiKey(): string {
  const k = process.env.BROWSER_USE_API_KEY;
  if (!k) throw new ConfigError("BROWSER_USE_API_KEY is not configured on the server.");
  return k;
}

export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return { "X-Browser-Use-API-Key": apiKey(), ...extra };
}

/** Log safely: status + a short id, never credentials or full bodies. */
export function auditLog(route: string, id: string, status: number) {
  console.info(`[${route}] ${id.slice(0, 12)}… -> ${status}`);
}

export function jsonError(message: string, status = 500) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}

export function handle(e: unknown) {
  if (e instanceof ConfigError) return jsonError(e.message, 500);
  return jsonError(e instanceof Error ? e.message : "Upstream request failed.", 502);
}

/** Pass an upstream response through, preserving SSE streaming. */
export async function passThrough(upstream: Response) {
  const ctype = upstream.headers.get("content-type") ?? "application/json";
  if (ctype.includes("text/event-stream") && upstream.body) {
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
