import { PROXY_ROUTES, ProxyUnavailableError, proxyUrl, readSse } from "./api";
import type { ChatMessage, ConnState, Settings } from "./types";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export const CHAT_SYSTEM_PROMPT = `You are the assistant inside "VisaMotion", a premium AI workspace for visa, recruitment, research and business automation run by a single administrator.

HARD RULES — CHAT-ONLY MODE:
- You have NO browser access. You cannot open, navigate, click, scrape, automate, start, stop or observe any browser or Browser Use run.
- Never claim to have performed a live web action, and never invent live data from a website.
- If the user asks you to actually do something in a browser, tell them to switch to the Agent tab, then offer to write the agent prompt for them.

WHAT YOU DO EXCELLENTLY:
- Writing precise Browser Use task prompts: a measurable goal, a start URL, constraints, an output schema, and a stop condition.
- Visa consultancy lead research (Singapore, Bangladesh, Gulf), recruitment research for foreign workers, candidate and agency sourcing plans.
- Explaining browser-automation concepts: live view URLs, CDP, sessions, steps, read-only mode, human takeover.
- Diagnosing failed runs from an event timeline and suggesting concrete fixes.
- Summarising and reviewing previous agent results the user pastes in.

STYLE: concise, warm, technical. Use markdown (short headings, bullets, links, \`\`\`code fences) when it improves clarity.`;

function directEndpoint(settings: Settings, stream: boolean) {
  const m = settings.geminiModel || "gemini-2.5-flash";
  const method = stream ? "streamGenerateContent?alt=sse&key=" : "generateContent?key=";
  return `${GEMINI_BASE}/${m}:${method}${encodeURIComponent(settings.geminiKey.trim())}`;
}

function buildBody(settings: Settings, history: ChatMessage[], prompt: string) {
  return {
    model: settings.geminiModel,
    contents: [
      ...history
        .filter((m) => !m.error && m.content.trim())
        .slice(-18)
        .map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] })),
      { role: "user", parts: [{ text: prompt }] },
    ],
    systemInstruction: { role: "user", parts: [{ text: CHAT_SYSTEM_PROMPT }] },
    generationConfig: { temperature: 0.7, topP: 0.95, maxOutputTokens: 2048 },
  };
}

function extractText(chunk: any): string {
  const parts = chunk?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) return parts.map((p: any) => p?.text ?? "").join("");
  if (typeof chunk?.text === "string") return chunk.text;
  if (typeof chunk?.delta === "string") return chunk.delta;
  return "";
}

async function parseApiError(res: Response): Promise<string> {
  const txt = await res.text().catch(() => "");
  try {
    const j = JSON.parse(txt);
    if (j?.error?.message) return j.error.message;
    if (j?.error) return String(j.error);
  } catch {
    /* fall through */
  }
  if (res.status === 401 || res.status === 403) return "Gemini rejected the API key (401/403). Check it in Settings → Gemini API.";
  if (res.status === 429) return "Gemini rate limit reached. Wait a moment and try again.";
  return txt ? `Gemini error ${res.status}: ${txt.slice(0, 200)}` : `Gemini error ${res.status}`;
}

export function chatConfigError(settings: Settings): string | null {
  if (settings.allowDirectCalls && !settings.geminiKey.trim()) {
    return "No Gemini API key. Add one in Settings → Gemini API.";
  }
  if (!settings.allowDirectCalls && !settings.geminiKey.trim() && !settings.proxyBase.trim()) {
    return "Chat needs either a Gemini API key (Settings → Gemini API) or a backend proxy that holds GEMINI_API_KEY server-side.";
  }
  return null;
}

export async function streamGemini(
  settings: Settings,
  history: ChatMessage[],
  prompt: string,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const cfgErr = chatConfigError(settings);
  if (cfgErr) throw new Error(cfgErr);

  const body = JSON.stringify(buildBody(settings, history, prompt));
  let res: Response;

  if (settings.allowDirectCalls) {
    res = await fetch(directEndpoint(settings, true), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal,
    });
  } else {
    const url = proxyUrl(settings, `${PROXY_ROUTES.chat}?stream=1`);
    try {
      res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body, signal });
    } catch (e) {
      throw new ProxyUnavailableError(url, e instanceof Error ? e.message : "network error");
    }
    if (res.status === 404 || res.status === 405 || (res.headers.get("content-type") ?? "").includes("text/html")) {
      throw new ProxyUnavailableError(url, `the chat route is not deployed here (HTTP ${res.status})`);
    }
  }

  if (!res.ok) throw new Error(await parseApiError(res));
  if (!res.body) throw new Error("Streaming is not supported in this environment.");

  let received = false;
  await readSse(
    res.body,
    (chunk) => {
      const t = extractText(chunk);
      if (t) {
        received = true;
        onDelta(t);
      }
    },
    signal,
  );
  if (!received && !signal?.aborted) throw new Error("Gemini returned an empty response. Try rephrasing the prompt.");
}

export async function testGemini(settings: Settings): Promise<{ state: ConnState; message: string }> {
  const cfgErr = chatConfigError(settings);
  if (cfgErr) return { state: "invalid", message: cfgErr };
  try {
    const body = JSON.stringify({
      model: settings.geminiModel,
      contents: [{ role: "user", parts: [{ text: "Reply with the single word: ready" }] }],
      generationConfig: { maxOutputTokens: 16 },
    });
    const res = settings.allowDirectCalls
      ? await fetch(directEndpoint(settings, false), { method: "POST", headers: { "Content-Type": "application/json" }, body })
      : await fetch(proxyUrl(settings, PROXY_ROUTES.chat), { method: "POST", headers: { "Content-Type": "application/json" }, body });

    if (res.ok) return { state: "connected", message: `${settings.geminiModel} responded successfully.` };
    if (res.status === 401 || res.status === 403) return { state: "invalid", message: await parseApiError(res) };
    if (res.status === 404) {
      return {
        state: "error",
        message: `The chat proxy route ${proxyUrl(settings, PROXY_ROUTES.chat)} is not deployed. Deploy /server or enable direct calls for local testing.`,
      };
    }
    return { state: "error", message: await parseApiError(res) };
  } catch (e) {
    return { state: "error", message: e instanceof Error ? e.message : "Network error." };
  }
}
