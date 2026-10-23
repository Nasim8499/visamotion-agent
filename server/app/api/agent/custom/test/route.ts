import { jsonError } from "../../../_lib/browserUse";

/** POST /api/agent/custom/test — reachability check for the custom provider. */
export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const baseUrl = String(process.env.CUSTOM_AGENT_BASE_URL ?? body?.config?.baseUrl ?? "").trim();
  if (!baseUrl) return jsonError("Custom provider `baseUrl` is required.", 400);

  try {
    const url = new URL(baseUrl);
    const headers: Record<string, string> = {};
    const key = process.env.CUSTOM_AGENT_API_KEY;
    if (key) {
      const name = String(body?.config?.authHeader || "Authorization");
      const prefix = String(body?.config?.authPrefix ?? "Bearer").trim();
      headers[name] = prefix ? `${prefix} ${key}` : key;
    }
    const res = await fetch(url.toString(), { method: "OPTIONS", headers });
    return Response.json({ ok: res.status < 500, status: res.status }, { status: res.status < 500 ? 200 : 502 });
  } catch (e) {
    return jsonError(e instanceof Error ? e.message : "Endpoint unreachable.", 502);
  }
}
