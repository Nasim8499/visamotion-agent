import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowDownToLine,
  Brain,
  Check,
  CircleCheck,
  Copy,
  Download,
  Eraser,
  ExternalLink,
  Keyboard,
  Link2,
  MonitorPlay,
  MousePointerClick,
  Pause,
  Play,
  Rocket,
  ScrollText,
  TimerOff,
  TriangleAlert,
  Wrench,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { EVENT_STYLE, FILTERS, clock, matchesFilter, statusMeta } from "@/lib/format";
import { useApp } from "@/lib/store";
import { isBusy, type AgentEvent, type EventFilter, type EventKind } from "@/lib/types";
import { Badge, EmptyState, ErrorState, Glass, IconBtn, Pill, Segmented, Skeleton, useCopy } from "./ui";
import { cn } from "@/utils/cn";

const ICONS: Record<EventKind, typeof Activity> = {
  "run.created": Rocket,
  "browser.ready": MonitorPlay,
  "browser.reattached": MonitorPlay,
  "step.started": Zap,
  "page.navigated": Link2,
  "action.clicked": MousePointerClick,
  "action.typed": Keyboard,
  "action.scrolled": ScrollText,
  "agent.thinking": Brain,
  "tool.used": Wrench,
  "file.downloaded": Download,
  "run.completed": CircleCheck,
  "run.failed": TriangleAlert,
  "session.expired": TimerOff,
  system: Activity,
};

function Row({ e }: { e: AgentEvent }) {
  const s = EVENT_STYLE[e.kind];
  const Icon = ICONS[e.kind];
  const [badShot, setBadShot] = useState(false);
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, x: 12, filter: "blur(5px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
      className="relative pl-9"
    >
      <span className="absolute left-[14px] top-7 h-[calc(100%-18px)] w-px bg-[rgb(var(--txt)/0.09)]" />
      <span className="absolute left-0 top-1 grid h-7 w-7 place-items-center rounded-full border backdrop-blur-xl" style={{ background: s.ring, borderColor: `${s.color}33` }}>
        <Icon className="h-[13.5px] w-[13.5px]" style={{ color: s.color }} strokeWidth={2} />
      </span>
      <div className="pb-4">
        <div className="flex items-baseline gap-2">
          <span className={cn("text-[12.5px] font-medium tracking-[-0.01em]", e.level === "error" ? "text-[#c62f34]" : e.level === "success" ? "text-[#0f7a36]" : "text-pri")}>
            {e.message}
          </span>
          <span className="ml-auto shrink-0 font-mono text-[10px] tabular-nums text-ter">{clock(e.ts)}</span>
        </div>
        {e.detail && <p className="mt-0.5 break-words text-[11.5px] leading-relaxed text-sec">{e.detail}</p>}
        {e.url && (
          <a href={e.url} target="_blank" rel="noreferrer" className="mt-1 flex max-w-full items-center gap-1 truncate font-mono text-[10.5px] text-[#0b5ed7] hover:underline">
            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{e.url}</span>
          </a>
        )}
        {e.screenshot && !badShot && (
          <a href={e.screenshot} target="_blank" rel="noreferrer" className="mt-2 block overflow-hidden rounded-xl border border-[rgb(var(--glass-edge))]">
            <img src={e.screenshot} alt="Step screenshot" loading="lazy" onError={() => setBadShot(true)} className="h-24 w-full object-cover object-top transition-transform duration-500 hover:scale-[1.04]" />
          </a>
        )}
      </div>
    </motion.li>
  );
}

export default function ActivityFeed({ onOpenSettings, className }: { onOpenSettings?: () => void; className?: string }) {
  const { run, events, startRun, retryRun, pushToast } = useApp();
  const [filter, setFilter] = useState<EventFilter>("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const [hovering, setHovering] = useState(false);
  const [clearedAt, setClearedAt] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { copied, copy } = useCopy();

  const busy = isBusy(run.status);
  const meta = statusMeta(run.status);
  const shown = useMemo(() => events.filter((e) => e.ts >= clearedAt), [events, clearedAt]);
  const visible = useMemo(() => shown.filter((e) => matchesFilter(e.kind, filter)), [shown, filter]);
  const errors = shown.filter((e) => e.level === "error").length;

  useEffect(() => {
    if (!autoScroll || hovering) return;
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [visible.length, run.output, autoScroll, hovering]);

  const result = run.output ?? "";

  return (
    <Glass className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      <div className="shrink-0 border-b border-[rgb(var(--glass-edge))]">
        <div className="flex items-center gap-2 px-4 pb-2.5 pt-3.5">
          <Activity className="h-4 w-4 text-[#1877f2]" />
          <h2 className="text-[13.5px] font-semibold tracking-[-0.01em] text-pri">Activity</h2>
          {shown.length > 0 && <span className="text-[11px] text-ter">{shown.length}</span>}
          <Badge tone={meta.tone} className="ml-auto">
            {meta.label}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5 px-3 pb-3">
          <Segmented
            size="sm"
            className="thin-scroll min-w-0 flex-1 overflow-x-auto [&>button]:flex-1"
            value={filter}
            onChange={setFilter}
            options={FILTERS.map((f) => ({ value: f.value, label: f.value === "errors" && errors ? `${f.label} ${errors}` : f.label }))}
          />
          <IconBtn label={autoScroll ? "Auto-scroll on (pauses on hover)" : "Auto-scroll paused"} onClick={() => setAutoScroll((a) => !a)} active={autoScroll} className="h-7 w-7">
            {autoScroll ? <ArrowDownToLine className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </IconBtn>
          <IconBtn
            label="Clear feed"
            className="h-7 w-7"
            onClick={() => {
              setClearedAt(Date.now());
              pushToast("Activity feed cleared", "ok");
            }}
          >
            <Eraser className="h-3.5 w-3.5" />
          </IconBtn>
        </div>
        {autoScroll && hovering && shown.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 border-t border-[rgb(var(--glass-edge))] bg-[rgb(var(--txt)/0.03)] py-1 text-[10px] text-ter">
            <Pause className="h-2.5 w-2.5" /> auto-scroll paused while hovering
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4"
      >
        {shown.length === 0 && !busy && (
          <EmptyState
            compact
            icon={<Activity className="h-5 w-5" />}
            title="No activity yet"
            description="Navigation, clicks, typing, thinking and tool calls stream here live."
            action={onOpenSettings && <Pill tone="ghost" size="sm" onClick={onOpenSettings}>Check API settings</Pill>}
          />
        )}
        {shown.length > 0 && visible.length === 0 && (
          <EmptyState
            compact
            icon={<Activity className="h-5 w-5" />}
            title={`No ${filter} events`}
            description="Nothing matched this filter yet."
            action={<Pill tone="ghost" size="sm" onClick={() => setFilter("all")}>Show all</Pill>}
          />
        )}

        <ul className="relative">
          <AnimatePresence initial={false}>
            {visible.map((e) => (
              <Row key={e.id} e={e} />
            ))}
          </AnimatePresence>
        </ul>

        {busy && (
          <div className="relative space-y-2 pl-9">
            <span className="absolute left-0 top-0 grid h-7 w-7 place-items-center rounded-full border border-[rgb(24_119_242/0.25)] bg-[rgb(24_119_242/0.1)]">
              <motion.span className="h-2 w-2 rounded-full bg-[#1877f2]" animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
            </span>
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        )}

        {run.error && (
          <div className="mt-2">
            <ErrorState
              compact
              title={run.errorHint === "settings" ? "Finish setup first" : "Run failed"}
              message={run.error}
              onRetry={run.errorHint === "settings" ? undefined : retryRun}
              secondary={onOpenSettings && <Pill tone="ghost" size="sm" onClick={onOpenSettings}>Open Settings</Pill>}
            />
          </div>
        )}

        <AnimatePresence>
          {result && !run.error && (
            <motion.div initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="mt-2 rounded-[20px] border border-[rgb(22_163_74/0.26)] bg-[rgb(22_163_74/0.06)] p-4">
              <div className="mb-2 flex items-center gap-2">
                <CircleCheck className="h-4 w-4 text-[#16a34a]" />
                <span className="text-[13px] font-semibold text-pri">Final result</span>
                <button onClick={() => copy(result)} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--glass-edge))] px-2.5 py-1 text-[11px] text-sec hover:text-pri">
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="thin-scroll max-h-56 overflow-auto whitespace-pre-wrap break-words font-sans text-[12px] leading-relaxed text-sec">{result}</pre>
              <div className="mt-3 space-y-1 border-t border-[rgb(var(--glass-edge))] pt-3 text-[11px] text-ter">
                {run.runId && <div className="flex justify-between gap-3"><span>Run</span><span className="truncate font-mono text-sec">{run.runId}</span></div>}
                {run.sessionId && <div className="flex justify-between gap-3"><span>Session</span><span className="truncate font-mono text-sec">{run.sessionId}</span></div>}
              </div>
              {run.recordingUrl && (
                <a href={run.recordingUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center gap-2 rounded-xl border border-[rgb(var(--glass-edge))] bg-white/60 px-3 py-2 text-[12px] text-sec hover:text-pri">
                  <Download className="h-3.5 w-3.5" /> Session recording <ExternalLink className="ml-auto h-3 w-3" />
                </a>
              )}
              {run.sessionId && !busy && (
                <Pill
                  tone="primary"
                  size="sm"
                  className="mt-3 w-full"
                  icon={<Play className="h-3.5 w-3.5" />}
                  onClick={() => startRun(run.task, { sessionId: run.sessionId, parentTaskId: run.taskId })}
                >
                  Run follow-up task
                </Pill>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Glass>
  );
}
