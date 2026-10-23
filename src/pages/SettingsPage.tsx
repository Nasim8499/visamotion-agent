import { motion } from "framer-motion";
import {
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import { Badge, Field, Glass, Input, Pill, Segmented, Select, Textarea, Toggle } from "@/components/ui";
import { PROXY_ROUTES, testBrowserUse, testCustom } from "@/lib/api";
import { testGemini } from "@/lib/gemini";
import { maskKey } from "@/lib/storage";
import { useApp } from "@/lib/store";
import { GEMINI_MODELS, type ConnState } from "@/lib/types";

type Test = { state: ConnState; message?: string };

function Section({
  icon,
  title,
  desc,
  accent,
  badge,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 280, damping: 30 }}>
      <Glass className="p-5 sm:p-6">
        <div className="mb-5 flex items-start gap-3.5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[15px] text-white shadow-lg" style={{ background: accent }}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[15.5px] font-semibold tracking-[-0.015em] text-pri">{title}</h2>
              {badge}
            </div>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ter">{desc}</p>
          </div>
        </div>
        <div className="space-y-4">{children}</div>
      </Glass>
    </motion.div>
  );
}

function StatusBadge({ s }: { s: ConnState }) {
  if (s === "connected") return <Badge tone="green"><Check className="h-3 w-3" /> Connected</Badge>;
  if (s === "invalid") return <Badge tone="red"><TriangleAlert className="h-3 w-3" /> Invalid key</Badge>;
  if (s === "testing") return <Badge tone="blue"><Loader2 className="h-3 w-3 animate-spin" /> Testing…</Badge>;
  if (s === "error") return <Badge tone="orange"><TriangleAlert className="h-3 w-3" /> Connection error</Badge>;
  return <Badge tone="neutral">Not connected</Badge>;
}

function SecretField({
  value,
  onChange,
  placeholder,
  onRemove,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  onRemove: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [reveal, setReveal] = useState(false);

  if (value) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[rgb(48_209_88/0.3)] bg-[rgb(48_209_88/0.08)] px-4 py-3">
        <Lock className="h-4 w-4 shrink-0 text-[#5ee08b]" />
        <span className="flex-1 truncate font-mono text-[13px] tracking-wider text-sec">{maskKey(value)}</span>
        <span className="text-[11px] text-ter">saved on this device</span>
        <button
          onClick={onRemove}
          className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--glass-border))] px-2.5 py-1 text-[11.5px] text-sec transition-colors hover:text-[#ff8b83]"
        >
          <Trash2 className="h-3 w-3" /> Remove key
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Input
        type={reveal ? "text" : "password"}
        value={draft}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) {
            onChange(draft.trim());
            setDraft("");
          }
        }}
        placeholder={placeholder}
        className="font-mono text-[13px]"
      />
      <button
        onClick={() => setReveal((r) => !r)}
        title={reveal ? "Hide" : "Show"}
        className="grid w-12 shrink-0 place-items-center rounded-2xl border border-[rgb(var(--glass-border))] text-ter hover:text-pri"
      >
        {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
      <Pill
        tone="primary"
        disabled={!draft.trim()}
        className="shrink-0"
        onClick={() => {
          onChange(draft.trim());
          setDraft("");
        }}
      >
        Save
      </Pill>
    </div>
  );
}

function TestLine({ t }: { t: Test }) {
  if (t.state === "unknown" || !t.message) return null;
  const tone = t.state === "connected" ? "green" : t.state === "invalid" ? "red" : t.state === "testing" ? "neutral" : "orange";
  return (
    <motion.p
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`text-[12px] leading-relaxed ${
        tone === "green" ? "text-[#7ee3a3]" : tone === "red" ? "text-[#ff8b83]" : tone === "orange" ? "text-[#ffc266]" : "text-sec"
      }`}
    >
      {t.message}
    </motion.p>
  );
}

export default function SettingsPage() {
  const { settings, setSettings, setCustom, pushToast } = useApp();
  const [bu, setBu] = useState<Test>({ state: "unknown" });
  const [cu, setCu] = useState<Test>({ state: "unknown" });
  const [gm, setGm] = useState<Test>({ state: "unknown" });

  const runBuTest = async () => {
    setBu({ state: "testing" });
    const r = await testBrowserUse(settings);
    setBu({ state: r.state, message: r.message });
    pushToast(r.state === "connected" ? "Browser Use connected" : "Browser Use test failed", r.state === "connected" ? "ok" : "err");
  };

  const runCuTest = async () => {
    setCu({ state: "testing" });
    const r = await testCustom(settings);
    setCu({ state: r.state, message: r.message });
    pushToast(r.state === "connected" ? "Custom endpoint reachable" : "Custom endpoint test failed", r.state === "connected" ? "ok" : "err");
  };

  const runGmTest = async () => {
    setGm({ state: "testing" });
    const r = await testGemini(settings);
    setGm({ state: r.state, message: r.message });
    pushToast(r.state === "connected" ? "Gemini connected" : "Gemini test failed", r.state === "connected" ? "ok" : "err");
  };

  const cfg = settings.custom;

  return (
    <div className="thin-scroll h-full overflow-y-auto pb-10 pr-1">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <div className="px-1 pb-1">
          <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-pri">Settings</h1>
          <p className="mt-1 text-[13.5px] text-sec">Connect your automation backend and AI keys.</p>
        </div>

        {/* security banner */}
        <Glass className="flex flex-wrap items-center gap-3 px-5 py-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-[#5ee08b]" />
          <p className="flex-1 text-[12.5px] leading-relaxed text-sec">
            <b className="text-pri">API keys are encrypted and never shared.</b> In production they live only in encrypted server
            secrets (<code className="font-mono">BROWSER_USE_API_KEY</code>, <code className="font-mono">GEMINI_API_KEY</code>,{" "}
            <code className="font-mono">CUSTOM_AGENT_API_KEY</code>). Anything you save in this browser stays on this device, displays
            masked as <code className="font-mono">****1234</code>, is never logged, and is not attached to any proxied request.
          </p>
        </Glass>

        {/* routing */}
        <Glass className="space-y-4 p-5 sm:p-6">
          <Field label="Active provider" hint="Switch which backend executes browser tasks. The live preview and activity feed are identical for both.">
            <Segmented
              className="w-full [&>button]:flex-1"
              value={settings.provider}
              onChange={(v) => setSettings({ provider: v })}
              options={[
                { value: "browser-use", label: "Browser Use Cloud" },
                { value: "custom", label: cfg.name || "Custom Agent API" },
              ]}
            />
          </Field>

          <Field
            label="Backend proxy base URL"
            hint={
              <>
                Leave empty to use same-origin routes. The app calls{" "}
                <code className="font-mono">{PROXY_ROUTES.run}</code>,{" "}
                <code className="font-mono">/api/agent/runs/[runId]/events</code>,{" "}
                <code className="font-mono">/api/agent/runs/[runId]/stop</code>,{" "}
                <code className="font-mono">/api/agent/session/[sessionId]/follow-up</code> and{" "}
                <code className="font-mono">/api/chat</code>. Deploy the routes in <code className="font-mono">/server</code>.
              </>
            }
          >
            <Input
              value={settings.proxyBase}
              onChange={(e) => setSettings({ proxyBase: e.target.value })}
              placeholder="https://your-app.vercel.app"
              className="font-mono text-[13px]"
            />
          </Field>

          <div className="flex items-start justify-between gap-4 rounded-2xl border border-[rgb(255_159_10/0.28)] bg-[rgb(255_159_10/0.07)] px-4 py-3">
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-pri">Direct browser calls (insecure)</div>
              <div className="mt-0.5 text-[11.5px] leading-relaxed text-[#ffc266]">
                Off by default. When enabled, this page talks to providers directly and your key is attached to browser network
                requests. Only use it for local testing — most providers also block it with CORS.
              </div>
            </div>
            <Toggle checked={settings.allowDirectCalls} tone="red" onChange={(v) => setSettings({ allowDirectCalls: v })} />
          </div>
        </Glass>

        {/* A — Browser Use */}
        <Section
          accent="linear-gradient(145deg,#6ab6ff,#0a84ff)"
          icon={<KeyRound className="h-5 w-5" />}
          title="Browser Use API"
          badge={<StatusBadge s={bu.state} />}
          desc="Browser Use Cloud API v4 · https://api.browser-use.com/api/v4 · header X-Browser-Use-API-Key. Required for real browser automation and the live preview."
        >
          <Field label="API key">
            <SecretField
              value={settings.browserUseKey}
              placeholder="bu_live_…"
              onChange={(v) => {
                setSettings({ browserUseKey: v });
                setBu({ state: "unknown" });
                pushToast("Browser Use key saved", "ok");
              }}
              onRemove={() => {
                setSettings({ browserUseKey: "" });
                setBu({ state: "unknown" });
                pushToast("Browser Use key removed", "ok");
              }}
            />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Pill tone="glass" onClick={runBuTest} disabled={bu.state === "testing"} icon={bu.state === "testing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Server className="h-4 w-4" />}>
              Test connection
            </Pill>
          </div>
          <TestLine t={bu} />

          <div className="flex items-center justify-between rounded-2xl border border-[rgb(var(--glass-border))] bg-[rgb(var(--txt)/0.04)] px-4 py-3">
            <div>
              <div className="text-[13px] font-medium text-pri">Read-only live view</div>
              <div className="text-[11.5px] text-ter">Appends ?readOnly=true to the live view URL</div>
            </div>
            <Toggle checked={settings.readOnly} tone="blue" onChange={(v) => setSettings({ readOnly: v, allowTakeover: !v })} />
          </div>
        </Section>

        {/* B — Custom */}
        <Section
          accent="linear-gradient(145deg,#bf5af2,#5e5ce6)"
          icon={<Server className="h-5 w-5" />}
          title="Custom Agent API"
          badge={<StatusBadge s={cu.state} />}
          desc="Connect your own browser-agent backend. The returned live URL renders in the same preview and its events feed the same timeline."
        >
          <div className="flex items-center justify-between rounded-2xl border border-[rgb(var(--glass-border))] bg-[rgb(var(--txt)/0.04)] px-4 py-3">
            <div>
              <div className="text-[13px] font-medium text-pri">Enable this provider</div>
              <div className="text-[11.5px] text-ter">Must be on before it can be selected above</div>
            </div>
            <Toggle checked={cfg.enabled} tone="blue" onChange={(v) => setCustom({ enabled: v })} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Provider name">
              <Input value={cfg.name} onChange={(e) => setCustom({ name: e.target.value })} placeholder="My Agent Backend" className="text-[13px]" />
            </Field>
            <Field label="Request method">
              <Input value={cfg.method} readOnly className="cursor-not-allowed font-mono text-[13px] opacity-70" />
            </Field>
          </div>

          <Field label="Base URL" hint="The endpoint that creates a run.">
            <Input value={cfg.baseUrl} onChange={(e) => setCustom({ baseUrl: e.target.value })} placeholder="https://agent.example.com/v1/runs" className="font-mono text-[13px]" />
          </Field>

          <Field label="API key">
            <SecretField
              value={cfg.apiKey}
              placeholder="sk_…"
              onChange={(v) => {
                setCustom({ apiKey: v });
                setCu({ state: "unknown" });
                pushToast("Custom API key saved", "ok");
              }}
              onRemove={() => {
                setCustom({ apiKey: "" });
                setCu({ state: "unknown" });
                pushToast("Custom API key removed", "ok");
              }}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Auth header name">
              <Input value={cfg.authHeader} onChange={(e) => setCustom({ authHeader: e.target.value })} placeholder="Authorization" className="font-mono text-[13px]" />
            </Field>
            <Field label="Auth prefix" hint="Leave empty to send the raw key.">
              <Input value={cfg.authPrefix} onChange={(e) => setCustom({ authPrefix: e.target.value })} placeholder="Bearer" className="font-mono text-[13px]" />
            </Field>
          </div>

          <Field label="Request body template" hint="Placeholders: {{task}}, {{startUrl}}, {{maxSteps}}, {{model}}, {{sessionId}}, {{record}}">
            <Textarea rows={8} value={cfg.bodyTemplate} onChange={(e) => setCustom({ bodyTemplate: e.target.value })} />
          </Field>

          <Field label="Response mode" hint="JSON returns a payload with a live URL. SSE streams events straight into the activity feed.">
            <Segmented
              value={cfg.responseMode}
              onChange={(v) => setCustom({ responseMode: v })}
              options={[
                { value: "json", label: "JSON" },
                { value: "sse", label: "SSE / streaming" },
              ]}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Live URL JSON path">
              <Input value={cfg.liveUrlPath} onChange={(e) => setCustom({ liveUrlPath: e.target.value })} placeholder="data.live_view_url" className="font-mono text-[13px]" />
            </Field>
            <Field label="Result JSON path">
              <Input value={cfg.resultPath} onChange={(e) => setCustom({ resultPath: e.target.value })} placeholder="data.result" className="font-mono text-[13px]" />
            </Field>
            <Field label="Event stream URL path (optional)">
              <Input value={cfg.eventsUrlPath} onChange={(e) => setCustom({ eventsUrlPath: e.target.value })} placeholder="data.events_url" className="font-mono text-[13px]" />
            </Field>
            <Field label="Status URL path (optional)" hint="Polled in JSON mode until the run completes.">
              <Input value={cfg.statusUrlPath} onChange={(e) => setCustom({ statusUrlPath: e.target.value })} placeholder="data.status_url" className="font-mono text-[13px]" />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Pill tone="glass" onClick={runCuTest} disabled={cu.state === "testing"} icon={cu.state === "testing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Server className="h-4 w-4" />}>
              Test connection
            </Pill>
          </div>
          <TestLine t={cu} />
        </Section>

        {/* C — Gemini */}
        <Section
          accent="linear-gradient(145deg,#43e07a,#0a84ff)"
          icon={<Sparkles className="h-5 w-5" />}
          title="Gemini API"
          badge={<StatusBadge s={gm.state} />}
          desc="Used only by the Chat tab. Chat never creates Browser Use runs and cannot control a browser."
        >
          <Field label="Google Gemini API key">
            <SecretField
              value={settings.geminiKey}
              placeholder="AIza…"
              onChange={(v) => {
                setSettings({ geminiKey: v });
                setGm({ state: "unknown" });
                pushToast("Gemini key saved", "ok");
              }}
              onRemove={() => {
                setSettings({ geminiKey: "" });
                setGm({ state: "unknown" });
                pushToast("Gemini key removed", "ok");
              }}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Chat model">
              <Select value={settings.geminiModel} onChange={(v) => setSettings({ geminiModel: v })} options={GEMINI_MODELS} />
            </Field>
            <div className="flex items-end">
              <Pill tone="glass" onClick={runGmTest} disabled={gm.state === "testing"} icon={gm.state === "testing" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}>
                Test connection
              </Pill>
            </div>
          </div>
          <TestLine t={gm} />
        </Section>

        {/* security details */}
        <Glass className="p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[#ffc266]" />
            <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-pri">Security model</h2>
          </div>
          <ul className="space-y-2.5 text-[12.5px] leading-relaxed text-sec">
            {[
              "Third-party calls go through the backend proxy; keys live in server environment variables (BROWSER_USE_API_KEY, GEMINI_API_KEY).",
              "Keys entered here stay on this device to connect your local proxy, are shown masked as ****1234, and are never printed to the console. Production keys live only in server environment secrets.",
              "live_view_url and CDP URLs are credentials — the app never exposes the CDP URL and warns before copying the live view link.",
              "Read-only mode appends ?readOnly=true so viewers cannot drive the session.",
              "The page ships a Content-Security-Policy allowing frame-src https://live.browser-use.com.",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#ffc266]" />
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-2xl border border-[rgb(var(--glass-border))] bg-[rgb(var(--txt)/0.04)] p-4 font-mono text-[11.5px] leading-relaxed text-ter">
            frame-src https://live.browser-use.com; connect-src 'self' https://api.browser-use.com
            https://generativelanguage.googleapis.com;
          </div>
        </Glass>
      </div>
    </div>
  );
}
