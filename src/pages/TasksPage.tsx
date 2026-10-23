import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  ListChecks,
  Play,
  Repeat2,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { EVENT_STYLE, clock, duration, fullTime, relTime, statusMeta } from "@/lib/format";
import { useApp } from "@/lib/store";
import { DEMO_TASKS, isBusy, type TaskRecord } from "@/lib/types";
import { Badge, EmptyState, Glass, Pill, Segmented, useCopy } from "@/components/ui";
import { cn } from "@/utils/cn";

type StatusFilter = "all" | "running" | "completed" | "failed";

const LIBRARY = [
  { title: "Cheapest flight finder", accent: "linear-gradient(145deg,#6ab6ff,#0a84ff)", task: DEMO_TASKS[0] },
  { title: "Price comparison", accent: "linear-gradient(145deg,#ffb45c,#ff9f0a)", task: DEMO_TASKS[1] },
  { title: "Job market scan", accent: "linear-gradient(145deg,#bf5af2,#5e5ce6)", task: DEMO_TASKS[2] },
  { title: "Competitive research", accent: "linear-gradient(145deg,#43e07a,#30d158)", task: DEMO_TASKS[3] },
];

function matchStatus(t: TaskRecord, f: StatusFilter) {
  if (f === "all") return true;
  if (f === "running") return isBusy(t.status);
  if (f === "completed") return t.status === "completed";
  return t.status === "failed" || t.status === "stopped";
}

function TaskDetail({
  task,
  onBack,
  onLaunch,
  onContinue,
}: {
  task: TaskRecord;
  onBack: () => void;
  onLaunch: (t: string) => void;
  onContinue: (t: TaskRecord) => void;
}) {
  const m = statusMeta(task.status);
  const { copy, copied } = useCopy();

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center gap-3 px-1">
        <Pill tone="ghost" size="sm" onClick={onBack} icon={<ArrowLeft className="h-3.5 w-3.5" />}>
          All tasks
        </Pill>
        <Badge tone={m.tone}>{m.label}</Badge>
        <Badge tone="neutral">{task.provider === "custom" ? "custom api" : "browser use"}</Badge>
        <span className="text-[12px] text-ter">{fullTime(task.createdAt)}</span>
      </div>

      <Glass className="p-5">
        <h1 className="text-[18px] font-semibold leading-snug tracking-[-0.02em] text-pri">{task.task}</h1>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Duration", value: task.durationMs ? duration(task.durationMs) : task.endedAt ? duration(task.endedAt - task.createdAt) : "—" },
            { label: "Steps", value: String(task.steps) },
            { label: "Run ID", value: task.runId ?? "—", mono: true },
            { label: "Session ID", value: task.sessionId ?? "—", mono: true },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-[rgb(var(--glass-border))] bg-[rgb(var(--txt)/0.04)] px-3.5 py-2.5">
              <div className="text-[10.5px] font-semibold tracking-[0.12em] text-ter uppercase">{s.label}</div>
              <div className={cn("mt-0.5 truncate text-[13px] text-pri", s.mono && "font-mono text-[11.5px]")}>{s.value}</div>
            </div>
          ))}
        </div>

        {task.startUrl && (
          <p className="mt-3 truncate font-mono text-[11.5px] text-ter">start URL: {task.startUrl}</p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <Pill tone="primary" size="sm" onClick={() => onLaunch(task.task)} icon={<Repeat2 className="h-3.5 w-3.5" />}>
            Run again
          </Pill>
          <Pill
            tone="glass"
            size="sm"
            disabled={!task.sessionId}
            onClick={() => onContinue(task)}
            icon={<Play className="h-3.5 w-3.5" />}
          >
            Continue in same session
          </Pill>
          {task.recordingUrl && (
            <a href={task.recordingUrl} target="_blank" rel="noreferrer">
              <Pill tone="glass" size="sm" icon={<Download className="h-3.5 w-3.5" />}>
                Recording
              </Pill>
            </a>
          )}
          {task.liveViewUrl && (
            <a href={task.liveViewUrl} target="_blank" rel="noreferrer">
              <Pill tone="glass" size="sm" icon={<ExternalLink className="h-3.5 w-3.5" />}>
                Live view
              </Pill>
            </a>
          )}
        </div>
      </Glass>

      {task.error && (
        <Glass className="border-[rgb(255_69_58/0.3)] p-5">
          <h2 className="mb-2 text-[13.5px] font-semibold text-[#ff8b83]">Error</h2>
          <p className="text-[12.5px] leading-relaxed text-[#ffb3ad]">{task.error}</p>
        </Glass>
      )}

      {task.output && (
        <Glass className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-[13.5px] font-semibold text-pri">Result</h2>
            <button
              onClick={() => copy(task.output ?? "")}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--glass-border))] px-2.5 py-1 text-[11.5px] text-sec hover:text-pri"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="thin-scroll max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-[rgb(var(--glass-border))] bg-[rgb(var(--txt)/0.04)] p-4 font-sans text-[12.5px] leading-relaxed text-sec">
            {task.output}
          </pre>
        </Glass>
      )}

      <Glass className="p-5">
        <h2 className="mb-3 text-[13.5px] font-semibold text-pri">Event timeline ({task.events?.length ?? 0})</h2>
        {!task.events?.length ? (
          <p className="text-[12.5px] text-ter">No events were captured for this run.</p>
        ) : (
          <ul className="thin-scroll max-h-96 space-y-2 overflow-y-auto pr-1">
            {task.events.map((e) => {
              const style = EVENT_STYLE[e.kind];
              return (
                <li key={e.id} className="flex items-start gap-2.5">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: style.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[12.5px] text-pri">{e.message}</span>
                      <span className="ml-auto shrink-0 font-mono text-[10.5px] text-ter">{clock(e.ts)}</span>
                    </div>
                    {e.detail && <p className="truncate text-[11.5px] text-ter">{e.detail}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Glass>
    </motion.div>
  );
}

export default function TasksPage({
  onLaunch,
  onContinue,
  openTaskId,
  setOpenTaskId,
}: {
  onLaunch: (task: string, immediate?: boolean) => void;
  onContinue: (task: TaskRecord) => void;
  openTaskId: string | null;
  setOpenTaskId: (id: string | null) => void;
}) {
  const { tasks, removeTask, clearTasks, pushToast } = useApp();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter(
      (t) =>
        matchStatus(t, status) &&
        (!q || t.task.toLowerCase().includes(q) || (t.output ?? "").toLowerCase().includes(q) || (t.sessionId ?? "").toLowerCase().includes(q)),
    );
  }, [query, status, tasks]);

  const open = openTaskId ? tasks.find((t) => t.id === openTaskId) : null;

  return (
    <div className="thin-scroll h-full overflow-y-auto pb-10 pr-1">
      <div className="mx-auto w-full max-w-5xl">
        <AnimatePresence mode="wait">
          {open ? (
            <TaskDetail
              key="detail"
              task={open}
              onBack={() => setOpenTaskId(null)}
              onLaunch={(t) => onLaunch(t, true)}
              onContinue={onContinue}
            />
          ) : (
            <motion.div key="list" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3 px-1">
                <div>
                  <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-pri">Tasks</h1>
                  <p className="mt-1 text-[13.5px] text-sec">Every run started from this device, with its live session and result.</p>
                </div>
                {tasks.length > 0 && (
                  <Pill
                    tone="ghost"
                    size="sm"
                    icon={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => {
                      clearTasks();
                      pushToast("Task history cleared", "ok");
                    }}
                  >
                    Clear history
                  </Pill>
                )}
              </div>

              {/* starter library */}
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {LIBRARY.map((l, i) => (
                  <motion.button
                    key={l.title}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, type: "spring", stiffness: 280, damping: 28 }}
                    onClick={() => onLaunch(l.task)}
                    className="glass glass-spec group rounded-[22px] p-4 text-left transition-colors hover:bg-[rgb(var(--glass-bg-strong))]"
                  >
                    <div className="mb-2.5 h-8 w-8 rounded-[11px] shadow-lg" style={{ background: l.accent }} />
                    <div className="text-[13px] font-semibold text-pri">{l.title}</div>
                    <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-ter">{l.task}</p>
                    <span className="mt-2 inline-block text-[11.5px] text-[#7ab8ff] opacity-0 transition-opacity group-hover:opacity-100">
                      Load into Agent →
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* search + filters */}
              <Glass className="flex flex-wrap items-center gap-3 p-3">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ter" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search tasks, results or session IDs…"
                    className="caret-ios ring-focus w-full rounded-full border border-[rgb(var(--glass-border))] bg-[rgb(var(--txt)/0.055)] py-2.5 pl-11 pr-9 text-[13.5px] text-pri placeholder:text-ter"
                  />
                  {query && (
                    <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-ter hover:text-pri">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <Segmented
                  value={status}
                  onChange={setStatus}
                  size="sm"
                  options={[
                    { value: "all", label: "All" },
                    { value: "running", label: "Running" },
                    { value: "completed", label: "Completed" },
                    { value: "failed", label: "Failed" },
                  ]}
                />
              </Glass>

              {tasks.length === 0 && (
                <Glass>
                  <EmptyState
                    icon={<ListChecks className="h-6 w-6" />}
                    title="No sessions yet"
                    description="Run an agent task and it will appear here with its status, duration, session ID, result and full event timeline."
                    action={
                      <Pill tone="primary" size="sm" onClick={() => onLaunch(DEMO_TASKS[0])}>
                        Load an example task
                      </Pill>
                    }
                  />
                </Glass>
              )}

              {tasks.length > 0 && filtered.length === 0 && (
                <Glass>
                  <EmptyState
                    compact
                    icon={<Search className="h-5 w-5" />}
                    title="No matching tasks"
                    description="Try a different search term or status filter."
                    action={
                      <Pill
                        tone="ghost"
                        size="sm"
                        onClick={() => {
                          setQuery("");
                          setStatus("all");
                        }}
                      >
                        Reset filters
                      </Pill>
                    }
                  />
                </Glass>
              )}

              <div className="space-y-2.5">
                {filtered.map((t, i) => {
                  const m = statusMeta(t.status);
                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.25), type: "spring", stiffness: 280, damping: 30 }}
                    >
                      <Glass
                        className="group cursor-pointer p-4 transition-colors hover:bg-[rgb(var(--glass-bg-strong))] sm:p-5"
                        onClick={() => setOpenTaskId(t.id)}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={m.tone}>
                            {isBusy(t.status) && <span className="mr-0.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
                            {m.label}
                          </Badge>
                          <Badge tone="neutral">{t.provider === "custom" ? "custom" : "browser use"}</Badge>
                          <span className="inline-flex items-center gap-1 text-[11.5px] text-ter">
                            <Clock className="h-3 w-3" /> {relTime(t.createdAt)}
                          </span>
                          {(t.durationMs || t.endedAt) && (
                            <span className="font-mono text-[11.5px] tabular-nums text-ter">
                              {duration(t.durationMs ?? (t.endedAt ?? 0) - t.createdAt)}
                            </span>
                          )}
                          <span className="text-[11.5px] text-ter">{t.steps} steps</span>
                          <div className="ml-auto flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <Pill tone="ghost" size="sm" onClick={() => onLaunch(t.task, true)} icon={<Repeat2 className="h-3.5 w-3.5" />}>
                              Run again
                            </Pill>
                            <Pill
                              tone="ghost"
                              size="sm"
                              onClick={() => {
                                removeTask(t.id);
                                pushToast("Task removed", "ok");
                              }}
                              icon={<Trash2 className="h-3.5 w-3.5" />}
                            >
                              Delete
                            </Pill>
                          </div>
                        </div>

                        <p className="mt-3 line-clamp-2 text-[14px] leading-relaxed tracking-[-0.01em] text-pri">{t.task}</p>

                        {(t.output || t.error) && (
                          <p className={cn("mt-2 line-clamp-2 text-[12.5px] leading-relaxed", t.error ? "text-[#ffb3ad]" : "text-ter")}>
                            {t.error ?? t.output}
                          </p>
                        )}

                        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ter">
                          {t.sessionId && <span className="font-mono">session: {t.sessionId.slice(0, 20)}</span>}
                          {t.recordingUrl && <span className="text-[#7ab8ff]">recording available</span>}
                          <span className="ml-auto text-[#7ab8ff] opacity-0 transition-opacity group-hover:opacity-100">Open details →</span>
                        </div>
                      </Glass>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
