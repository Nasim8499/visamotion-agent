import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  KeyRound,
  Link2,
  Lock,
  Maximize2,
  Minimize2,
  MonitorPlay,
  RotateCw,
  Square,
  Unlock,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { decorateLiveUrl } from "@/lib/api";
import { duration, hostOf, statusMeta } from "@/lib/format";
import { useApp } from "@/lib/store";
import { isBusy } from "@/lib/types";
import { Badge, Dot, EmptyState, ErrorState, Glass, IconBtn, Pill, useCopy } from "./ui";

const IFRAME_GRACE_MS = 9000;

function Chrome({ host, children }: { host: string; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[20px] border border-[rgb(var(--glass-edge))] bg-white/70">
      <div className="flex shrink-0 items-center gap-3 border-b border-[rgb(var(--glass-edge))] bg-white/60 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-[11px] w-[11px] rounded-full bg-[#ff5f57]" />
          <span className="h-[11px] w-[11px] rounded-full bg-[#febc2e]" />
          <span className="h-[11px] w-[11px] rounded-full bg-[#28c840]" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[rgb(var(--glass-edge))] bg-white/70 px-3 py-1">
          <Lock className="h-3 w-3 shrink-0 text-[#16a34a]" />
          <span className="truncate text-[11.5px] text-sec">{host || "about:blank"}</span>
        </div>
        <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-[rgb(var(--glass-edge))] bg-white/70 px-2.5 py-1 text-[10.5px] font-medium text-ter sm:flex">
          <Dot tone="blue" /> Secure cloud browser
        </span>
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </div>
  );
}

function Starting({ label }: { label: string }) {
  return (
    <div className="grid h-full place-items-center p-8">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <div className="relative mb-6 grid h-24 w-24 place-items-center">
          <motion.span
            className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(24,119,242,0.3),transparent_68%)] blur-xl"
            animate={{ scale: [1, 1.22, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span
            className="absolute inset-2 rounded-full border border-[rgb(24_119_242/0.18)]"
            style={{ borderTopColor: "#1877f2" }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
          <div className="glass glass-spec grid h-14 w-14 place-items-center rounded-[18px]">
            <Lock className="h-6 w-6 text-[#1877f2]" />
          </div>
        </div>
        <p className="text-[15.5px] font-medium tracking-[-0.015em] text-pri">Starting secure browser…</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ter">
          {label} · waiting for <code className="rounded bg-[rgb(var(--txt)/0.07)] px-1 py-0.5">browser.ready</code> to return the live
          view URL.
        </p>
        <div className="mt-7 w-full space-y-2.5">
          <div className="shimmer h-9 rounded-xl" />
          <div className="grid grid-cols-3 gap-2.5">
            <div className="shimmer h-24 rounded-xl" />
            <div className="shimmer h-24 rounded-xl" />
            <div className="shimmer h-24 rounded-xl" />
          </div>
          <div className="shimmer h-3 w-2/3 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function LivePreview({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { run, settings, setSettings, stopRun, retryRun, pushToast } = useApp();
  const [now, setNow] = useState(Date.now());
  const [full, setFull] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const loadedRef = useRef(false);
  const { copied, copy } = useCopy();

  const busy = isBusy(run.status);
  const meta = statusMeta(run.status);
  const live = run.liveViewUrl;
  const needsSetup = run.errorHint === "settings";

  useEffect(() => {
    if (!busy) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [busy]);

  const elapsed = run.startedAt ? (run.finishedAt ?? now) - run.startedAt : 0;

  const src = useMemo(() => {
    if (!live) return null;
    const decorated = decorateLiveUrl(live, settings.readOnly && !settings.allowTakeover);
    if (!nonce) return decorated;
    try {
      const u = new URL(decorated);
      u.searchParams.set("_r", String(nonce));
      return u.toString();
    } catch {
      return `${decorated}${decorated.includes("?") ? "&" : "?"}_r=${nonce}`;
    }
  }, [live, settings.readOnly, settings.allowTakeover, nonce]);

  useEffect(() => {
    setLoaded(false);
    loadedRef.current = false;
    setBlocked(false);
    if (!src) return;
    const t = window.setTimeout(() => {
      if (!loadedRef.current) setBlocked(true);
    }, IFRAME_GRACE_MS);
    return () => window.clearTimeout(t);
  }, [src]);

  useEffect(() => {
    const onFs = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && full) setFull(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("keydown", onKey);
    };
  }, [full]);

  const openNew = useCallback(() => {
    if (!src) return;
    const w = window.open(src, "_blank", "noopener,noreferrer");
    if (!w) pushToast("Pop-up blocked — allow pop-ups for this site", "err");
  }, [pushToast, src]);

  const toggleFull = useCallback(async () => {
    if (!wrapRef.current) return;
    try {
      if (!document.fullscreenElement) await wrapRef.current.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      pushToast("Fullscreen was blocked by the browser", "err");
    }
  }, [pushToast]);

  return (
    <Glass className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">
      <div ref={wrapRef} className="flex min-h-0 flex-1 flex-col gap-3 bg-white/0">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <motion.div layout className="flex items-center gap-2 rounded-full border border-[rgb(var(--glass-edge))] bg-[rgb(var(--glass-bg-strong))] px-3 py-1.5">
            <Dot tone={meta.dot} pulse={busy} />
            <span className="text-[12.5px] font-medium text-pri">{meta.label}</span>
          </motion.div>
          {run.startedAt && <Badge tone="neutral" className="font-mono tabular-nums">{duration(elapsed)}</Badge>}
          <Badge tone="blue">step {run.step}/{run.maxSteps}</Badge>
          {live && (
            <Badge tone={settings.readOnly && !settings.allowTakeover ? "neutral" : "orange"}>
              {settings.readOnly && !settings.allowTakeover ? <Eye className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
              {settings.readOnly && !settings.allowTakeover ? "read-only" : "interactive"}
            </Badge>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <IconBtn
              label="Copy live view URL"
              disabled={!src}
              onClick={() => {
                if (!src) return;
                copy(src);
                pushToast("Live view URL copied — treat it as a credential", "ok");
              }}
            >
              {copied ? <Check className="h-4 w-4 text-[#16a34a]" /> : <Copy className="h-4 w-4" />}
            </IconBtn>
            <IconBtn label="Reload preview" disabled={!src} onClick={() => setNonce((n) => n + 1)}>
              <RotateCw className="h-4 w-4" />
            </IconBtn>
            <IconBtn label="Open in new tab" disabled={!src} onClick={openNew}>
              <ExternalLink className="h-4 w-4" />
            </IconBtn>
            <IconBtn
              label={settings.readOnly ? "Read-only: on (tap to allow control)" : "Read-only: off"}
              active={settings.readOnly && !settings.allowTakeover}
              onClick={() => setSettings({ readOnly: !settings.readOnly, allowTakeover: settings.readOnly })}
            >
              {settings.readOnly && !settings.allowTakeover ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </IconBtn>
            <IconBtn label="Fullscreen" onClick={toggleFull}>
              {full ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </IconBtn>
            <Pill tone="danger" size="sm" disabled={!busy} onClick={stopRun} icon={<Square className="h-3 w-3 fill-current" />}>
              Stop
            </Pill>
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          <Chrome host={live ? hostOf(live) : busy ? "connecting…" : ""}>
            <AnimatePresence mode="wait">
              {src && !blocked ? (
                <motion.div key={`f-${nonce}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                  {!loaded && (
                    <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-xl">
                      <Starting label={meta.label} />
                    </div>
                  )}
                  <iframe
                    src={src}
                    title="Browser Use live session"
                    allow="autoplay; clipboard-read; clipboard-write"
                    onLoad={() => {
                      loadedRef.current = true;
                      setLoaded(true);
                      setBlocked(false);
                    }}
                    className="absolute inset-0 h-full w-full border-0 bg-white"
                  />
                </motion.div>
              ) : blocked ? (
                <motion.div key="blocked" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 grid place-items-center overflow-y-auto p-5">
                  <div className="w-full max-w-lg">
                    <ErrorState
                      title="Live preview blocked"
                      message="Live preview blocked by browser security policy. Please open the live view in a new tab."
                      onRetry={() => {
                        setBlocked(false);
                        setNonce((n) => n + 1);
                      }}
                      retryLabel="Retry embedding"
                      secondary={
                        <Pill tone="primary" size="sm" onClick={openNew} icon={<ExternalLink className="h-3.5 w-3.5" />}>
                          Open live view
                        </Pill>
                      }
                    />
                    <p className="mt-2 px-1 text-[11px] leading-relaxed text-ter">
                      Your CSP needs <code className="rounded bg-[rgb(var(--txt)/0.07)] px-1">frame-src https://live.browser-use.com</code>.
                    </p>
                  </div>
                </motion.div>
              ) : run.error ? (
                <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 grid place-items-center overflow-y-auto p-5">
                  <div className="w-full max-w-lg">
                    <ErrorState
                      title={needsSetup ? "Finish setup first" : "Run failed"}
                      message={run.error}
                      onRetry={needsSetup ? undefined : retryRun}
                      secondary={
                        <Pill tone="primary" size="sm" onClick={onOpenSettings} icon={<KeyRound className="h-3.5 w-3.5" />}>
                          {needsSetup ? "Open Settings" : "Check Settings"}
                        </Pill>
                      }
                    />
                  </div>
                </motion.div>
              ) : busy ? (
                <motion.div key="start" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0">
                  <Starting label={meta.label} />
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 grid place-items-center">
                  <EmptyState
                    icon={<MonitorPlay className="h-7 w-7" />}
                    title="No live session yet"
                    description={
                      <>
                        Describe a task and press <b className="text-sec">Run Agent</b>. The real cloud browser appears here as soon as{" "}
                        <code className="rounded bg-[rgb(var(--txt)/0.07)] px-1">browser.ready</code> fires.
                      </>
                    }
                    action={
                      <Pill tone="glass" size="sm" onClick={onOpenSettings} icon={<KeyRound className="h-3.5 w-3.5" />}>
                        API settings
                      </Pill>
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {live && !settings.readOnly && (
              <div className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-[rgba(229,72,77,0.45)]">
                <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-[rgba(229,72,77,0.9)] px-3 py-1 text-[10.5px] font-semibold tracking-wide text-white shadow-lg">
                  LIVE CONTROL ENABLED
                </div>
              </div>
            )}
          </Chrome>
        </div>

        {live && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[10.5px] text-ter">
            <Link2 className="h-3 w-3 shrink-0" />
            <span className="truncate font-mono">{hostOf(live)}/…</span>
            {!blocked && (
              <button onClick={() => setBlocked(true)} className="shrink-0 font-medium text-[#0b5ed7] underline-offset-2 hover:underline">
                Preview not showing?
              </button>
            )}
            <span className="ml-auto shrink-0">Live view URLs are credentials</span>
          </div>
        )}
      </div>
    </Glass>
  );
}
