import { BROWSER_USE_BASE, auditLog, authHeaders, handle, jsonError, passThrough } from "../../../../_lib/browserUse";

/**
 * GET /api/agent/runs/[runId]/events
 * Streams run events (SSE pass-through) or returns the JSON event list.
 * The client watches for `browser.ready` and extracts live_view_url from it.
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ runId: string }> }) {
  const { runId } = await ctx.params;
  if (!runId) return jsonError("`runId` is required.", 400);

  try {
    const upstream = await fetch(`${BROWSER_USE_BASE}/runs/${encodeURIComponent(runId)}/events`, {
      headers: authHeaders({ Accept: "text/event-stream, application/json" }),
    });
    auditLog("agent/events", runId, upstream.status);
    return passThrough(upstream);
  } catch (e) {
    return handle(e);
  }
}
