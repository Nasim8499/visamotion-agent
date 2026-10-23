/**
 * POST /api/chat           — Gemini chat proxy (chat only, no browser control).
 * POST /api/chat?stream=1  — Server-Sent Events stream.
 *
 * GEMINI_API_KEY stays server-side; only conversation turns cross the wire.
 */
export const runtime = "edge";
export const dynamic = "force-dynamic";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const ALLOWED_MODELS = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite"];

const SYSTEM = `You are the assistant inside "VisaMotion", a premium AI workspace for visa, recruitment, research and business automation.
You are in CHAT-ONLY mode: you have no browser access, cannot start/stop/observe Browser Use runs, and must never claim to have performed a live web action.
Help the user write precise browser-agent prompts, plan visa and recruitment research, explain automation concepts, diagnose failed runs and review results.`;

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return Response.json({ error: "GEMINI_API_KEY is not configured on the server." }, { status: 500 });

  const stream = new URL(req.url).searchParams.get("stream") === "1";
  const body = await req.json().catch(() => null);
  if (!body?.contents) return Response.json({ error: "`contents` is required." }, { status: 400 });

  const requested = typeof body.model === "string" ? body.model : "gemini-2.5-flash";
  const model = ALLOWED_MODELS.includes(requested) ? requested : "gemini-2.5-flash";
  const method = stream ? "streamGenerateContent?alt=sse&key=" : "generateContent?key=";

  const payload = {
    contents: body.contents,
    systemInstruction: body.systemInstruction ?? { role: "user", parts: [{ text: SYSTEM }] },
    generationConfig: body.generationConfig ?? { temperature: 0.7, maxOutputTokens: 2048 },
  };

  try {
    const upstream = await fetch(`${GEMINI_BASE}/${model}:${method}${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.info(`[chat] ${model} stream=${stream} -> ${upstream.status}`);

    if (stream && upstream.body) {
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
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Gemini unreachable." }, { status: 502 });
  }
}
