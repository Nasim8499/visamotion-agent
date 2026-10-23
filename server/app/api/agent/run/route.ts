import { BROWSER_USE_BASE, auditLog, authHeaders, handle, jsonError, passThrough } from "../../_lib/browserUse";

/**
 * POST /api/agent/run
 * Creates a Browser Use Cloud v4 run:
 *   POST https://api.browser-use.com/api/v4/runs
 *   { task, startUrl?, keepAlive: 900, enableRecording: true }
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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
    keepAlive: Number(body.keepAlive ?? 900),
    enableRecording: body.enableRecording !== false,
  };
  if (body.startUrl) payload.startUrl = String(body.startUrl);
  if (body.maxSteps) payload.maxSteps = Number(body.maxSteps);
  if (body.model) payload.model = String(body.model);

  try {
    const upstream = await fetch(`${BROWSER_USE_BASE}/runs`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
    });
    auditLog("agent/run", task, upstream.status);
    return passThrough(upstream);
  } catch (e) {
    return handle(e);
  }
}
