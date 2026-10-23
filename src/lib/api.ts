import type {
  AgentEvent,
  CustomProviderConfig,
  EventKind,
  RunStatus,
  Settings,
} from "./types";
import { uid } from "./storage";

/** Browser Use Cloud API v4 — used ONLY by the backend proxy. */
export const BROWSER_USE_BASE = "https://api.browser-use.com/api/v4";

/* ------------------------------------------------------------------ */
/* Proxy routing                                                       */
/* ------------------------------------------------------------------ */

export const PROXY_ROUTES = {
  run: "/api/agent/run",
  events: (runId: string) => `/api/agent/runs/${encodeURIComponent(runId)}/events`,
  stop: (runId: string) => `/api/agent/runs/${encodeURIComponent(runId)}/stop`,
  followUp: (sessionId: string) => `/api/agent/session/${encodeURIComponent(sessionId)}/follow-up`,
  ping: "/api/agent/ping",
  chat: "/api/chat",
  custom: "/api/agent/custom",
};

export function proxyUrl(settings: Settings, path: string) {
  const base = settings.proxyBase.trim().replace(/\/+$/, "");
  return base ? `${base}${path}` : path;
}

export class ProxyUnavailableError extends Error {
  constructor(public url: string, public reason: string) {
    super(
      `Backend proxy not reachable at ${url} — ${reason}. Deploy the routes in /server (Next.js App Router) or set a Proxy Base URL in Settings. ` +
        `API keys are never sent from the browser unless you explicitly enable "Direct browser calls" in Settings.`,
    );
    this.name = "ProxyUnavailableError";
  }
}

/** Fetch through the proxy and translate infrastructure failures into clear errors. */
async function proxyFetch(settings: Settings, path: string, init?: RequestInit): Promise<Response> {
  const url = proxyUrl(settings, path);
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    throw new ProxyUnavailableError(url, e instanceof Error ? e.message : "network error");
  }
  if (res.status === 404 || res.status === 405) {
    throw new ProxyUnavailableError(url, `the route responded ${res.status}`);
  }
  const ctype = res.headers.get("content-type") ?? "";
  // A static host will answer index.html for unknown paths — detect that.
  if (ctype.includes("text/html")) {
    throw new ProxyUnavailableError(url, "the route returned HTML instead of JSON (no backend deployed here)");
  }
  return res;
}

export async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const text = await res.text();
    try {
      const j = JSON.parse(text);
      const raw = j.error ?? j.message ?? j.detail ?? `${fallback} (HTTP ${res.status})`;
      return typeof raw === "string" ? raw : `${fallback} (HTTP ${res.status}): ${JSON.stringify(raw).slice(0, 220)}`;
    } catch {
      return text ? `${fallback} (HTTP ${res.status}): ${text.slice(0, 220)}` : `${fallback} (HTTP ${res.status})`;
    }
  } catch {
    return `${fallback} (HTTP ${res.status})`;
  }
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

const LEVEL: Record<EventKind, AgentEvent["level"]> = {
  "run.created": "info",
  "browser.ready": "success",
  "browser.reattached": "success",
  "step.started": "info",
  "page.navigated": "info",
  "action.clicked": "info",
  "action.typed": "info",
  "action.scrolled": "info",
  "agent.thinking": "info",
  "tool.used": "info",
  "file.downloaded": "success",
  "run.completed": "success",
  "run.failed": "error",
  "session.expired": "error",
  system: "info",
};

export function makeEvent(kind: EventKind, message: string, extra: Partial<AgentEvent> = {}): AgentEvent {
  return { id: uid("ev"), ts: Date.now(), kind, message, level: LEVEL[kind], ...extra };
}

const ALIASES: Record<string, EventKind> = {
  "run.created": "run.created",
  "run.started": "run.created",
  "task.created": "run.created",
  "browser.ready": "browser.ready",
  "session.ready": "browser.ready",
  "browser.started": "browser.ready",
  "browser.reattached": "browser.reattached",
  "browser.attached": "browser.reattached",
  "live_view.ready": "browser.ready",
  "step.started": "step.started",
  "step.start": "step.started",
  "agent.step": "step.started",
  "page.navigated": "page.navigated",
  navigation: "page.navigated",
  "browser.navigated": "page.navigated",
  "page.loaded": "page.navigated",
  "action.clicked": "action.clicked",
  click: "action.clicked",
  "action.typed": "action.typed",
  type: "action.typed",
  input_text: "action.typed",
  "action.scrolled": "action.scrolled",
  scroll: "action.scrolled",
  "agent.thinking": "agent.thinking",
  thinking: "agent.thinking",
  reasoning: "agent.thinking",
  "tool.used": "tool.used",
  "tool.called": "tool.used",
  tool: "tool.used",
  "file.downloaded": "file.downloaded",
  download: "file.downloaded",
  "run.completed": "run.completed",
  "task.completed": "run.completed",
  completion: "run.completed",
  "run.finished": "run.completed",
  "run.failed": "run.failed",
  error: "run.failed",
  "task.failed": "run.failed",
  "session.expired": "session.expired",
  "session.closed": "session.expired",
};

function classify(type: string, data: any): EventKind {
  const t = String(type || "").toLowerCase();
  if (ALIASES[t]) return ALIASES[t];
  const action = String(data?.action ?? data?.action_type ?? data?.name ?? "").toLowerCase();
  if (/click/.test(t + action)) return "action.clicked";
  if (/type|input|fill|keyboard/.test(t + action)) return "action.typed";
  if (/scroll/.test(t + action)) return "action.scrolled";
  if (/download/.test(t + action)) return "file.downloaded";
  if (/navigat|goto|url/.test(t + action)) return "page.navigated";
  if (/think|reason|plan/.test(t)) return "agent.thinking";
  if (/tool|function/.test(t)) return "tool.used";
  if (/expire/.test(t)) return "session.expired";
  if (/fail|error/.test(t)) return "run.failed";
  if (/complete|finish|done/.test(t)) return "run.completed";
  if (/step/.test(t)) return "step.started";
  return "system";
}

function humanMessage(kind: EventKind, data: any, step?: number): string {
  const url = data?.url ?? data?.page_url ?? data?.pageUrl;
  const target = data?.selector ?? data?.element ?? data?.target ?? data?.index;
  const text = data?.text ?? data?.value ?? data?.input;
  switch (kind) {
    case "run.created":
      return "Run created";
    case "browser.ready":
      return "Browser ready — live view attached";
    case "browser.reattached":
      return "Browser reattached — live view restored";
    case "step.started":
      return `Step ${step ?? "?"} started`;
    case "page.navigated":
      return url ? `Navigated to ${safeHost(url)}` : "Page navigated";
    case "action.clicked":
      return target ? `Clicked ${String(target).slice(0, 48)}` : "Clicked element";
    case "action.typed":
      return text ? `Typed “${String(text).slice(0, 48)}”` : "Typed text";
    case "action.scrolled":
      return "Scrolled the page";
    case "agent.thinking":
      return "Agent thinking";
    case "tool.used":
      return `Used tool: ${data?.tool ?? data?.name ?? "function"}`;
    case "file.downloaded":
      return `Downloaded ${data?.filename ?? data?.file ?? "file"}`;
    case "run.completed":
      return "Run completed";
    case "run.failed":
      return "Run failed";
    case "session.expired":
      return "Session expired";
    default:
      return String(data?.message ?? data?.description ?? "Event").slice(0, 110);
  }
}

function safeHost(u: string) {
  try {
    return new URL(u).host;
  } catch {
    return u.slice(0, 48);
  }
}

export function normalizeEvent(raw: any): AgentEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const type: string = raw.type ?? raw.event ?? raw.name ?? raw.kind ?? "system";
  const data = raw.data ?? raw.payload ?? raw;
  const kind = classify(type, data);
  const step = numOr(data?.step ?? data?.step_number ?? data?.stepNumber ?? raw.step);
  const url = strOr(data?.url ?? data?.page_url ?? data?.pageUrl);
  const screenshot = strOr(
    data?.screenshot_url ?? data?.screenshotUrl ?? data?.screenshot ?? data?.thumbnail ?? data?.image_url,
  );
  const detailRaw =
    data?.thought ??
    data?.reasoning ??
    data?.goal ??
    data?.message ??
    data?.description ??
    data?.summary ??
    (kind === "run.failed" ? (data?.error ?? data?.detail) : undefined) ??
    (typeof data === "string" ? data : undefined);

  const ts = raw.created_at ?? raw.createdAt ?? raw.timestamp ?? raw.ts;

  return {
    id: strOr(raw.id) ?? uid("ev"),
    ts: ts ? new Date(ts).getTime() || Date.now() : Date.now(),
    kind,
    level: LEVEL[kind],
    message: humanMessage(kind, data, step),
    detail: detailRaw ? String(detailRaw).slice(0, 700) : undefined,
    step,
    url,
    screenshot: screenshot && /^https?:|^data:image/.test(screenshot) ? screenshot : undefined,
  };
}

const numOr = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const strOr = (v: unknown) => (typeof v === "string" && v ? v : undefined);

/* ------------------------------------------------------------------ */
/* JSON path helpers (custom provider)                                 */
/* ------------------------------------------------------------------ */

export function getPath(obj: any, path: string): unknown {
  if (!path) return undefined;
  return path.split(".").reduce<any>((acc, key) => {
    if (acc == null) return undefined;
    const m = key.match(/^(.*?)\[(\d+)\]$/);
    if (m) return acc[m[1]]?.[Number(m[2])];
    return acc[key];
  }, obj);
}

export function pickLiveUrl(obj: any, explicitPath?: string): string | null {
  if (explicitPath) {
    const v = getPath(obj, explicitPath);
    if (typeof v === "string" && /^https?:\/\//.test(v)) return v;
  }
  const stack = [obj];
  let guard = 0;
  while (stack.length && guard++ < 200) {
    const cur = stack.pop();
    if (!cur || typeof cur !== "object") continue;
    for (const [k, v] of Object.entries(cur)) {
      if (typeof v === "string" && /^https?:\/\//.test(v) && /live.?view|liveurl|live_url|viewer|sessionurl|session_url/i.test(k)) {
        return v;
      }
      if (v && typeof v === "object") stack.push(v);
    }
  }
  return null;
}

export function pickSessionId(obj: any): string | null {
  const c = [obj?.session_id, obj?.sessionId, obj?.session?.id, obj?.data?.session_id, obj?.data?.sessionId, obj?.data?.session?.id];
  for (const x of c) if (typeof x === "string" && x) return x;
  return null;
}

export function pickRunId(obj: any): string | null {
  const c = [obj?.id, obj?.run_id, obj?.runId, obj?.data?.id, obj?.data?.run_id, obj?.data?.runId];
  for (const x of c) if (typeof x === "string" && x) return x;
  return null;
}

/** Live view URLs are credentials. Read-only mode appends ?readOnly=true. */
export function decorateLiveUrl(url: string, readOnly: boolean): string {
  try {
    const u = new URL(url);
    if (readOnly) u.searchParams.set("readOnly", "true");
    else u.searchParams.delete("readOnly");
    return u.toString();
  } catch {
    if (!readOnly) return url;
    return `${url}${url.includes("?") ? "&" : "?"}readOnly=true`;
  }
}

/* ------------------------------------------------------------------ */
/* Runner                                                              */
/* ------------------------------------------------------------------ */

export interface RunPatch {
  runId?: string | null;
  sessionId?: string | null;
  liveViewUrl?: string | null;
  status?: RunStatus;
  step?: number;
  output?: string | null;
  structured?: unknown;
  recordingUrl?: string | null;
  error?: string | null;
  errorHint?: string | null;
}

export interface RunCallbacks {
  onEvent: (e: AgentEvent) => void;
  onPatch: (p: RunPatch) => void;
}

export interface RunOptions {
  task: string;
  startUrl?: string;
  maxSteps: number;
  record: boolean;
  model?: string;
  sessionId?: string | null;
  keepAlive?: number;
}

export interface RunnerHandle {
  stop: () => Promise<void>;
  abort: () => void;
}

/* ---------------- Browser Use (via proxy) ---------------- */

export function runBrowserUse(settings: Settings, opts: RunOptions, cb: RunCallbacks): RunnerHandle {
  const ctrl = new AbortController();
  let runId: string | null = null;
  let finished = false;

  const fail = (message: unknown, hint?: string) => {
    if (ctrl.signal.aborted) return;
    finished = true;
    const msg = typeof message === "string" ? message : message != null ? JSON.stringify(message).slice(0, 260) : "Run failed.";
    cb.onEvent(makeEvent("run.failed", "Run failed", { detail: msg }));
    cb.onPatch({ status: "failed", error: msg, errorHint: hint ?? null });
  };

  const start = async () => {
    try {
      const isFollowUp = !!opts.sessionId;
      const path = isFollowUp ? PROXY_ROUTES.followUp(opts.sessionId!) : PROXY_ROUTES.run;

      cb.onEvent(
        makeEvent("system", isFollowUp ? "Sending follow-up to existing session" : "Creating run", {
          detail: `POST ${proxyUrl(settings, path)}`,
        }),
      );

      const body: Record<string, unknown> = {
        task: opts.task,
        keepAlive: opts.keepAlive ?? 900,
        enableRecording: opts.record,
      };
      if (opts.startUrl) body.startUrl = opts.startUrl;
      if (opts.maxSteps) body.maxSteps = opts.maxSteps;
      if (opts.model && opts.model !== "browser-use-default") body.model = opts.model;
  
      const res = await transport(settings, path, {
        method: "POST",
        headers: jsonHeaders(settings),
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });

      if (!res.ok) return fail(await readError(res, "Could not create the Browser Use run"));

      const json = await res.json().catch(() => ({}));
      runId = pickRunId(json);
      const sessionId = pickSessionId(json) ?? opts.sessionId ?? null;
      const live = pickLiveUrl(json);

      cb.onEvent(makeEvent("run.created", "Run created", { detail: runId ? `run ${runId}` : undefined }));
      cb.onPatch({ runId, sessionId, status: "starting", liveViewUrl: live });

      if (live) {
        cb.onEvent(makeEvent(isFollowUp ? "browser.reattached" : "browser.ready", isFollowUp ? "Browser reattached — live view restored" : "Browser ready — live view attached"));
        cb.onPatch({ status: "ready" });
      }

      if (!runId) {
        return fail(
          "The API response did not include a run id, so events cannot be streamed.",
          "Check that your proxy forwards the raw Browser Use response body.",
        );
      }
      await consume(runId);
    } catch (e) {
      if (ctrl.signal.aborted) return;
      if (e instanceof ProxyUnavailableError) return fail(e.message, "proxy");
      fail(e instanceof Error ? e.message : "Unexpected error while starting the run.");
    }
  };

  const consume = async (id: string) => {
    const res = await transport(settings, PROXY_ROUTES.events(id), {
      headers: { ...jsonHeaders(settings), Accept: "text/event-stream, application/json" },
      signal: ctrl.signal,
    });
    if (!res.ok) return fail(await readError(res, "Could not open the run event stream"));

    const ctype = res.headers.get("content-type") ?? "";
    if (ctype.includes("text/event-stream") && res.body) {
      await readSse(res.body, handle, ctrl.signal);
      if (!finished && !ctrl.signal.aborted) await poll(id, 0);
      return;
    }
    const json = await res.json().catch(() => []);
    const list = asList(json);
    list.forEach(handle);
    if (!finished) await poll(id, list.length);
  };

  const poll = async (id: string, seen: number) => {
    let cursor = seen;
    let misses = 0;
    while (!finished && !ctrl.signal.aborted) {
      await sleep(1500);
      try {
        const res = await transport(settings, PROXY_ROUTES.events(id), {
          headers: jsonHeaders(settings),
          signal: ctrl.signal,
        });
        if (!res.ok) {
          if (++misses > 6) return fail(await readError(res, "Lost connection to the run event stream"));
          continue;
        }
        misses = 0;
        const list = asList(await res.json().catch(() => []));
        list.slice(cursor).forEach(handle);
        cursor = list.length;
      } catch (e) {
        if (ctrl.signal.aborted) return;
        if (++misses > 6) return fail(e instanceof Error ? e.message : "Event polling failed.");
      }
    }
  };

  const handle = (raw: any) => {
    const e = normalizeEvent(raw);
    if (!e) return;
    cb.onEvent(e);

    const patch: RunPatch = {};
    const data = raw?.data ?? raw;
    const live = pickLiveUrl(raw);
    const session = pickSessionId(raw);
    if (live) patch.liveViewUrl = live;
    if (session) patch.sessionId = session;
    if (e.step) patch.step = e.step;

    if (e.kind === "browser.ready" || e.kind === "browser.reattached") patch.status = "ready";
    else if (e.kind === "step.started" || e.kind === "page.navigated" || e.kind.startsWith("action.") || e.kind === "agent.thinking" || e.kind === "tool.used") {
      patch.status = "working";
    }

    if (e.kind === "run.completed") {
      finished = true;
      patch.status = "completed";
      patch.output = strOr(data?.output ?? data?.result ?? data?.final_result ?? data?.answer) ?? e.detail ?? "Task finished.";
      patch.structured = data;
      patch.recordingUrl = strOr(data?.recording_url ?? data?.recordingUrl ?? data?.video_url) ?? null;
    }
    if (e.kind === "run.failed" || e.kind === "session.expired") {
      finished = true;
      patch.status = "failed";
      patch.error = e.detail ?? (e.kind === "session.expired" ? "The cloud browser session expired." : "The agent reported an error.");
    }
    if (Object.keys(patch).length) cb.onPatch(patch);
  };

  start();

  return {
    abort: () => {
      finished = true;
      ctrl.abort();
    },
    stop: async () => {
      finished = true;
      if (runId) {
        try {
          const res = await transport(settings, PROXY_ROUTES.stop(runId), {
            method: "POST",
            headers: jsonHeaders(settings),
          });
          if (!res.ok) cb.onEvent(makeEvent("system", "Stop request rejected", { detail: await readError(res, "Stop failed") }));
        } catch (e) {
          cb.onEvent(makeEvent("system", "Stop request failed", { detail: e instanceof Error ? e.message : "network error" }));
        }
      }
      ctrl.abort();
    },
  };
}

/* ---------------- Custom provider ---------------- */

const sub = (s: string, token: string, value: string) => s.split(token).join(value);

export function renderTemplate(tpl: string, opts: RunOptions): unknown {
  let filled = sub(tpl, "{{task}}", opts.task.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n"));
  filled = sub(filled, "{{startUrl}}", opts.startUrl ?? "");
  filled = sub(filled, "{{maxSteps}}", String(opts.maxSteps));
  filled = sub(filled, "{{model}}", opts.model ?? "");
  filled = sub(filled, "{{sessionId}}", opts.sessionId ?? "");
  filled = sub(filled, "{{record}}", String(opts.record));
  try {
    return JSON.parse(filled);
  } catch (e) {
    throw new Error(
      `Request body template is not valid JSON after substitution: ${e instanceof Error ? e.message : "parse error"}`,
    );
  }
}

export function customHeaders(cfg: CustomProviderConfig, direct: boolean): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (direct && cfg.apiKey.trim()) {
    const name = cfg.authHeader.trim() || "Authorization";
    const prefix = cfg.authPrefix.trim();
    h[name] = prefix ? `${prefix} ${cfg.apiKey.trim()}` : cfg.apiKey.trim();
  }
  return h;
}

export function runCustom(settings: Settings, opts: RunOptions, cb: RunCallbacks): RunnerHandle {
  const ctrl = new AbortController();
  const cfg = settings.custom;
  let finished = false;

  const fail = (message: string, hint?: string) => {
    if (ctrl.signal.aborted) return;
    finished = true;
    cb.onEvent(makeEvent("run.failed", "Run failed", { detail: message }));
    cb.onPatch({ status: "failed", error: message, errorHint: hint ?? null });
  };

  const start = async () => {
    if (!cfg.baseUrl.trim()) {
      return fail("Custom API Base URL is empty. Add it in Settings → Custom Agent API.", "settings");
    }
    if (!cfg.enabled) {
      return fail("The Custom Agent API provider is disabled. Enable it in Settings → Custom Agent API.", "settings");
    }

    let body: unknown;
    try {
      body = renderTemplate(cfg.bodyTemplate, opts);
    } catch (e) {
      return fail(e instanceof Error ? e.message : "Invalid body template.", "settings");
    }

    cb.onEvent(makeEvent("system", `Calling ${cfg.name || "custom backend"}`, { detail: cfg.baseUrl }));

    try {
      const direct = settings.allowDirectCalls;
      const res = direct
        ? await fetch(cfg.baseUrl.trim(), {
            method: "POST",
            headers: { ...customHeaders(cfg, true), ...(cfg.responseMode === "sse" ? { Accept: "text/event-stream" } : {}) },
            body: JSON.stringify(body),
            signal: ctrl.signal,
          })
        : await proxyFetch(settings, PROXY_ROUTES.custom, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ config: redactConfig(cfg), payload: body }),
            signal: ctrl.signal,
          });

      if (!res.ok) return fail(await readError(res, `${cfg.name || "Custom backend"} rejected the request`));

      const ctype = res.headers.get("content-type") ?? "";
      if (cfg.responseMode === "sse" || ctype.includes("text/event-stream")) {
        if (!res.body) return fail("The custom endpoint returned no body for SSE mode.");
        cb.onPatch({ status: "starting" });
        cb.onEvent(makeEvent("run.created", "Run created", { detail: "streaming events" }));
        await readSse(res.body, handle, ctrl.signal);
        if (!finished && !ctrl.signal.aborted) {
          finished = true;
          cb.onPatch({ status: "completed", output: "Stream closed by the custom backend." });
        }
        return;
      }

      const json = await res.json().catch(() => null);
      if (!json) return fail("The custom endpoint did not return valid JSON.");

      const live = pickLiveUrl(json, cfg.liveUrlPath);
      const result = getPath(json, cfg.resultPath);
      const eventsUrl = strOr(getPath(json, cfg.eventsUrlPath));
      const statusUrl = strOr(getPath(json, cfg.statusUrlPath));

      cb.onEvent(makeEvent("run.created", "Run created", { detail: pickRunId(json) ?? undefined }));
      cb.onPatch({
        runId: pickRunId(json) ?? uid("custom"),
        sessionId: pickSessionId(json) ?? opts.sessionId ?? null,
        liveViewUrl: live,
        status: live ? "ready" : "working",
      });

      if (live) cb.onEvent(makeEvent("browser.ready", "Browser ready — live view attached", { detail: safeHost(live) }));
      else {
        cb.onEvent(
          makeEvent("system", "No live view URL in the response", {
            detail: `Checked JSON path "${cfg.liveUrlPath}". Update it in Settings → Custom Agent API if your payload differs.`,
          }),
        );
      }

      if (eventsUrl) {
        await streamFrom(eventsUrl);
        return;
      }
      if (statusUrl) {
        await pollStatus(statusUrl);
        return;
      }

      finished = true;
      cb.onPatch({
        status: "completed",
        output: result != null ? (typeof result === "string" ? result : JSON.stringify(result, null, 2)) : JSON.stringify(json, null, 2),
        structured: json,
        recordingUrl: strOr(json?.recording_url ?? json?.data?.recording_url) ?? null,
      });
      cb.onEvent(makeEvent("run.completed", "Run completed"));
    } catch (e) {
      if (ctrl.signal.aborted) return;
      if (e instanceof ProxyUnavailableError) return fail(e.message, "proxy");
      fail(
        e instanceof Error && /Failed to fetch|NetworkError|load failed/i.test(e.message)
          ? `Could not reach ${cfg.baseUrl} — the endpoint is unreachable or blocked by CORS. Allow this origin on your backend, or route through the proxy.`
          : e instanceof Error
            ? e.message
            : "Custom backend call failed.",
      );
    }
  };

  const streamFrom = async (url: string) => {
    try {
      const res = await fetch(url, {
        headers: { ...customHeaders(cfg, settings.allowDirectCalls), Accept: "text/event-stream" },
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) return fail(await readError(res, "Could not open the custom event stream"));
      await readSse(res.body, handle, ctrl.signal);
    } catch (e) {
      if (!ctrl.signal.aborted) fail(e instanceof Error ? e.message : "Event stream failed.");
    }
  };

  const pollStatus = async (url: string) => {
    let misses = 0;
    while (!finished && !ctrl.signal.aborted) {
      await sleep(2000);
      try {
        const res = await fetch(url, { headers: customHeaders(cfg, settings.allowDirectCalls), signal: ctrl.signal });
        if (!res.ok) {
          if (++misses > 5) return fail(await readError(res, "Status polling failed"));
          continue;
        }
        misses = 0;
        const json = await res.json();
        const live = pickLiveUrl(json, cfg.liveUrlPath);
        if (live) cb.onPatch({ liveViewUrl: live });
        asList(json?.events ?? json?.data?.events ?? []).forEach(handle);
        const status = String(json?.status ?? json?.data?.status ?? "").toLowerCase();
        if (/complete|success|done|finished/.test(status)) {
          finished = true;
          const result = getPath(json, cfg.resultPath);
          cb.onEvent(makeEvent("run.completed", "Run completed"));
          cb.onPatch({
            status: "completed",
            output: result != null ? (typeof result === "string" ? result : JSON.stringify(result, null, 2)) : JSON.stringify(json, null, 2),
            structured: json,
          });
        } else if (/fail|error/.test(status)) {
          fail(strOr(json?.error) ?? "The custom backend reported a failure.");
        }
      } catch (e) {
        if (ctrl.signal.aborted) return;
        if (++misses > 5) return fail(e instanceof Error ? e.message : "Status polling failed.");
      }
    }
  };

  const handle = (raw: any) => {
    const e = normalizeEvent(raw);
    if (!e) return;
    cb.onEvent(e);
    const patch: RunPatch = {};
    const live = pickLiveUrl(raw, cfg.liveUrlPath);
    if (live) {
      patch.liveViewUrl = live;
      patch.status = "ready";
    }
    if (e.step) patch.step = e.step;
    if (e.kind === "browser.ready" || e.kind === "browser.reattached") patch.status = "ready";
    else if (e.kind !== "system") patch.status = "working";
    if (e.kind === "run.completed") {
      finished = true;
      const data = raw?.data ?? raw;
      const result = getPath(raw, cfg.resultPath) ?? data?.output ?? data?.result;
      patch.status = "completed";
      patch.output = result != null ? (typeof result === "string" ? result : JSON.stringify(result, null, 2)) : (e.detail ?? "Done.");
      patch.structured = data;
    }
    if (e.kind === "run.failed" || e.kind === "session.expired") {
      finished = true;
      patch.status = "failed";
      patch.error = e.detail ?? "The custom backend reported an error.";
    }
    if (Object.keys(patch).length) cb.onPatch(patch);
  };

  start();
  return { abort: () => { finished = true; ctrl.abort(); }, stop: async () => { finished = true; ctrl.abort(); } };
}

/** Config forwarded to the proxy — the key is replaced server-side from env. */
function redactConfig(cfg: CustomProviderConfig) {
  const { apiKey: _omit, ...rest } = cfg;
  void _omit;
  return rest;
}

/* ------------------------------------------------------------------ */
/* Transport selection                                                 */
/* ------------------------------------------------------------------ */

function jsonHeaders(settings: Settings): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  // The key is attached ONLY when the user explicitly opted into direct calls.
  if (settings.allowDirectCalls && settings.browserUseKey.trim()) {
    h["X-Browser-Use-API-Key"] = settings.browserUseKey.trim();
  }
  return h;
}

/** Direct mode talks to Browser Use; otherwise everything goes through the proxy. */
async function transport(settings: Settings, path: string, init: RequestInit): Promise<Response> {
  if (!settings.allowDirectCalls) return proxyFetch(settings, path, init);

  const direct = directUrlFor(path);
  if (!direct) return proxyFetch(settings, path, init);
  try {
    return await fetch(direct, init);
  } catch (e) {
    throw new Error(
      `Direct call to ${direct} failed (${e instanceof Error ? e.message : "network error"}). ` +
        `Browser Use blocks cross-origin browser requests — turn off "Direct browser calls" and use the backend proxy.`,
    );
  }
}

function directUrlFor(path: string): string | null {
  if (path === PROXY_ROUTES.run) return `${BROWSER_USE_BASE}/runs`;
  if (path === PROXY_ROUTES.ping) return `${BROWSER_USE_BASE}/me`;
  let m = path.match(/^\/api\/agent\/runs\/(.+)\/events$/);
  if (m) return `${BROWSER_USE_BASE}/runs/${m[1]}/events`;
  m = path.match(/^\/api\/agent\/runs\/(.+)\/stop$/);
  if (m) return `${BROWSER_USE_BASE}/runs/${m[1]}/stop`;
  m = path.match(/^\/api\/agent\/session\/(.+)\/follow-up$/);
  if (m) return `${BROWSER_USE_BASE}/sessions/${m[1]}/task`;
  return null;
}

/* ------------------------------------------------------------------ */
/* Connection tests                                                    */
/* ------------------------------------------------------------------ */

export async function testBrowserUse(settings: Settings): Promise<{ state: "connected" | "invalid" | "error"; message: string }> {
  if (settings.allowDirectCalls && !settings.browserUseKey.trim()) {
    return { state: "invalid", message: "Enter a Browser Use API key first." };
  }
  try {
    const res = await transport(settings, PROXY_ROUTES.ping, { headers: jsonHeaders(settings) });
    if (res.ok) return { state: "connected", message: "Connected to Browser Use Cloud v4" };
    if (res.status === 401 || res.status === 403) return { state: "invalid", message: "Invalid API key — Browser Use rejected it (401/403)." };
    return { state: "error", message: await readError(res, "Connection test failed") };
  } catch (e) {
    return { state: "error", message: e instanceof Error ? e.message : "Connection test failed." };
  }
}

export async function testCustom(settings: Settings): Promise<{ state: "connected" | "invalid" | "error"; message: string }> {
  const cfg = settings.custom;
  if (!cfg.baseUrl.trim()) return { state: "invalid", message: "Enter a base URL first." };
  try {
    new URL(cfg.baseUrl.trim());
  } catch {
    return { state: "invalid", message: "That base URL is not a valid absolute URL." };
  }
  try {
    const res = settings.allowDirectCalls
      ? await fetch(cfg.baseUrl.trim(), { method: "OPTIONS", headers: customHeaders(cfg, true) })
      : await proxyFetch(settings, `${PROXY_ROUTES.custom}/test`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config: redactConfig(cfg) }),
        });
    if (res.status === 401 || res.status === 403) return { state: "invalid", message: "Endpoint reachable but rejected the credentials (401/403)." };
    if (res.status >= 500) return { state: "error", message: `Endpoint returned HTTP ${res.status}.` };
    return { state: "connected", message: `Endpoint reachable (HTTP ${res.status}).` };
  } catch (e) {
    if (e instanceof ProxyUnavailableError) return { state: "error", message: e.message };
    return { state: "error", message: e instanceof Error ? e.message : "Endpoint unreachable." };
  }
}

/* ------------------------------------------------------------------ */
/* Utils                                                               */
/* ------------------------------------------------------------------ */

function asList(json: any): any[] {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.events)) return json.events;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.data?.events)) return json.data.events;
  if (Array.isArray(json?.items)) return json.items;
  return [];
}

export async function readSse(
  body: ReadableStream<Uint8Array>,
  onMessage: (data: any) => void,
  signal?: AbortSignal,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  try {
    while (true) {
      if (signal?.aborted) break;
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const chunks = buf.split(/\r?\n\r?\n/);
      buf = chunks.pop() ?? "";
      for (const chunk of chunks) {
        let eventName: string | undefined;
        const dataLines: string[] = [];
        for (const line of chunk.split(/\r?\n/)) {
          if (line.startsWith("event:")) eventName = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
        }
        const payload = dataLines.join("\n");
        if (!payload || payload === "[DONE]") continue;
        try {
          const parsed = JSON.parse(payload);
          onMessage(eventName && !parsed.type ? { type: eventName, ...parsed } : parsed);
        } catch {
          onMessage({ type: eventName ?? "system", data: { message: payload } });
        }
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
