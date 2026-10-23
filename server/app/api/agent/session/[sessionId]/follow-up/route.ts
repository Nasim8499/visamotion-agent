import { BROWSER_USE_BASE, auditLog, authHeaders, handle, jsonError, passThrough } from "../../../../_lib/browserUse";

/**
 * POST /api/agent/session/[sessionId]/follow-up
 * Queues another task on an EXISTING cloud browser session so the agent keeps
 * its cookies, tabs and page state. Falls back to creating a run bound to the
 * session if the deployment's API surface expects that shape.
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;
  if (!sessionId) return jsonError("`sessionId` is required.", 400);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const task = String(body.task ?? "").trim();
  if (!task) return jsonError("`task` is required.", 400);

  const payload: Record<string, unknown> = {
    task,
    sessionId,
    keepAlive: Number(body.keepAlive ?? 900),
    enableRecording: body.enableRecording !== false,
  };
  if (body.maxSteps) payload.maxSteps = Number(body.maxSteps);
  if (body.model) payload.model = String(body.model);

  try {
    const headers = authHeaders({ "Content-Type": "application/json" });

    // Preferred: attach the task to the live session.
    let upstream = await fetch(`${BROWSER_USE_BASE}/sessions/${encodeURIComponent(sessionId)}/task`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    // Fallback: create a run that reuses the session id.
    if (upstream.status === 404 || upstream.status === 405) {
      upstream = await fetch(`${BROWSER_USE_BASE}/runs`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
    }

    auditLog("agent/follow-up", sessionId, upstream.status);
    return passThrough(upstream);
  } catch (e) {
    return handle(e);
  }
}
