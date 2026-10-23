import { BROWSER_USE_BASE, authHeaders, handle } from "../../_lib/browserUse";

/** GET /api/agent/ping — credential check for Settings → Test connection. */
export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const upstream = await fetch(`${BROWSER_USE_BASE}/me`, { headers: authHeaders() });
    // Only the status is surfaced; account payloads are not echoed to the client.
    return Response.json(
      { ok: upstream.ok, status: upstream.status },
      { status: upstream.ok ? 200 : upstream.status, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return handle(e);
  }
}
