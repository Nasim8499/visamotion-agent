import { BROWSER_USE_BASE, auditLog, authHeaders, handle, jsonError, passThrough } from "../../../../_lib/browserUse";

/** POST /api/agent/runs/[runId]/stop — stops the run and releases the cloud browser. */
export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: { params: Promise<{ runId: string }> }) {
  const { runId } = await ctx.params;
  if (!runId) return jsonError("`runId` is required.", 400);

  try {
    const upstream = await fetch(`${BROWSER_USE_BASE}/runs/${encodeURIComponent(runId)}/stop`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
    });
    auditLog("agent/stop", runId, upstream.status);
    return passThrough(upstream);
  } catch (e) {
    return handle(e);
  }
}
