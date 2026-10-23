import { MonitorPlay } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Globe, KeyRound, Play, Settings2, Shield, Sparkles, Square, TriangleAlert } from "lucide-react";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { AGENT_MODELS, DEMO_TASKS, isBusy } from "@/lib/types";
import { Glass, IconBtn, Input, Pill, Segmented, Select, Shine, Toggle } from "./ui";
import { cn } from "@/utils/cn";

export interface AgentFormHandle {
  focus: () => void;
}

const AgentForm = forwardRef<AgentFormHandle, { task: string; setTask: (v: string) => void; onOpenSettings: () => void }>(
  function AgentForm({ task, setTask, onOpenSettings }, ref) {
    const { run, settings, setSettings, startRun, stopRun, configError, previewDock, togglePreviewDock } = useApp();
    const [open, setOpen] = useState(false);
    const areaRef = useRef<HTMLTextAreaElement>(null);
    const busy = isBusy(run.status);
    const canFollowUp = !!run.sessionId && (run.status === "completed" || run.status === "stopped");

    useImperativeHandle(ref, () => ({ focus: () => areaRef.current?.focus() }), []);

    const submit = () => {
      if (!task.trim()) {
        areaRef.current?.focus();
        return;
      }
      startRun(task);
    };
    const followUp = () => startRun(task, { sessionId: run.sessionId, parentTaskId: run.taskId });

    return (
      <Glass className="relative z-20 overflow-visible p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
            <div className="relative w-full flex-1 sm:w-auto">
              <textarea
                ref={areaRef}
                value={task}
                onChange={(e) => setTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    submit();
                  }
                }}
                rows={2}
                placeholder="Describe what the agent should do… e.g. find the cheapest Dhaka → Singapore flight next month"
                className="ring-focus w-full resize-none rounded-[22px] border border-[rgb(var(--glass-edge))] bg-[rgb(var(--glass-bg-strong))] px-5 py-3.5 pr-24 text-[15px] leading-relaxed tracking-[-0.01em] text-pri placeholder:text-ter backdrop-blur-xl"
              />
              <div className="pointer-events-none absolute bottom-3 right-4 hidden items-center gap-1 text-[10.5px] text-ter sm:flex">
                <kbd className="rounded-md border border-[rgb(var(--glass-edge))] px-1.5 py-0.5">⌘</kbd>
                <kbd className="rounded-md border border-[rgb(var(--glass-edge))] px-1.5 py-0.5">↵</kbd>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end pb-0.5 sm:self-auto">
              <IconBtn label="Task options" active={open} onClick={() => setOpen((o) => !o)}>
                <Settings2 className="h-4 w-4" />
              </IconBtn>
              <Pill
                tone={previewDock ? "primary" : "glass"}
                size="lg"
                icon={<MonitorPlay className="h-4 w-4" />}
                onClick={togglePreviewDock}
                title="Show the live browser preview"
                className={previewDock ? "ring-1 ring-[rgb(24_119_242/0.5)]" : ""}
              >
                {previewDock ? "Hide preview" : "Preview"}
              </Pill>
              {busy ? (
                <Pill tone="danger" size="lg" icon={<Square className="h-4 w-4 fill-current" />} onClick={stopRun}>
                  Stop
                </Pill>
              ) : (
                <Pill
                  tone="primary"
                  size="lg"
                  icon={<Sparkles className="h-4 w-4" />}
                  disabled={!task.trim()}
                  onClick={submit}
                  className="relative min-w-[136px] overflow-hidden"
                >
                  Run Agent
                  <Shine active={!!task.trim()} />
                </Pill>
              )}
            </div>
          </div>

          {canFollowUp && (
            <motion.button
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={followUp}
              disabled={!task.trim()}
              className="flex items-center gap-2 self-start rounded-full border border-[rgb(24_119_242/0.3)] bg-[rgb(24_119_242/0.1)] px-3.5 py-1.5 text-[12px] font-medium text-[#0b5ed7] transition-colors hover:bg-[rgb(24_119_242/0.16)] disabled:opacity-40"
            >
              <ArrowUp className="h-3.5 w-3.5" />
              Run follow-up in session {run.sessionId?.slice(0, 10)}…
            </motion.button>
          )}

          <div className="thin-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
            {DEMO_TASKS.map((t) => (
              <button
                key={t}
                onClick={() => setTask(t)}
                className={cn(
                  "pill-press shrink-0 whitespace-nowrap rounded-full border border-[rgb(var(--glass-edge))] bg-[rgb(var(--glass-bg-strong))] px-3.5 py-1.5 text-[12px] text-sec backdrop-blur-xl transition-colors hover:text-pri",
                  task === t && "border-[rgb(24_119_242/0.4)] bg-[rgb(24_119_242/0.1)] text-[#0b5ed7]",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: "spring", stiffness: 340, damping: 34 }}
                className="overflow-hidden"
              >
                <div className="grid gap-3 rounded-[22px] border border-[rgb(var(--glass-edge))] bg-[rgb(var(--glass-bg-strong))] p-3.5 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="mb-1.5 text-[10.5px] font-semibold tracking-[0.1em] text-ter uppercase">Start URL (optional)</p>
                    <div className="relative">
                      <Globe className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ter" />
                      <Input value={settings.startUrl} onChange={(e) => setSettings({ startUrl: e.target.value })} placeholder="https://google.com" className="py-2.5 pl-10 text-[13px]" />
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[10.5px] font-semibold tracking-[0.1em] text-ter uppercase">Model</p>
                    <Select value={settings.model} onChange={(v) => setSettings({ model: v })} options={AGENT_MODELS} />
                  </div>
                  <div>
                    <p className="mb-1.5 text-[10.5px] font-semibold tracking-[0.1em] text-ter uppercase">Max steps · {settings.maxSteps}</p>
                    <div className="flex h-[42px] items-center rounded-2xl border border-[rgb(var(--glass-edge))] field-bg px-4">
                      <input
                        type="range"
                        min={5}
                        max={100}
                        step={5}
                        value={settings.maxSteps}
                        onChange={(e) => setSettings({ maxSteps: Number(e.target.value) })}
                        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-[rgb(var(--txt)/0.16)] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_2px_6px_rgba(15,30,60,0.35)]"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[10.5px] font-semibold tracking-[0.1em] text-ter uppercase">Browser provider</p>
                    <Segmented
                      className="w-full [&>button]:flex-1"
                      size="sm"
                      value={settings.provider}
                      onChange={(v) => setSettings({ provider: v })}
                      options={[
                        { value: "browser-use", label: "Browser Use" },
                        { value: "custom", label: "Custom API" },
                      ]}
                    />
                  </div>

                  <div>
                    <p className="mb-1.5 text-[10.5px] font-semibold tracking-[0.1em] text-ter uppercase">Keep browser alive</p>
                    <Select
                      value={String(settings.keepAlive)}
                      onChange={(v) => setSettings({ keepAlive: Number(v) })}
                      options={[
                        { id: "300", label: "5 minutes" },
                        { id: "900", label: "15 minutes" },
                        { id: "1800", label: "30 minutes" },
                        { id: "3600", label: "1 hour" },
                      ]}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-[rgb(var(--glass-edge))] bg-[rgb(var(--txt)/0.03)] px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Shield className="h-4 w-4 text-[#d97706]" />
                      <div className="leading-tight">
                        <div className="text-[12.5px] font-medium text-pri">Human takeover</div>
                        <div className="text-[10.5px] text-ter">Interactive live view</div>
                      </div>
                    </div>
                    <Toggle checked={settings.allowTakeover} tone="red" onChange={(v) => setSettings({ allowTakeover: v, readOnly: !v })} />
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-[rgb(var(--glass-edge))] bg-[rgb(var(--txt)/0.03)] px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#e5484d]" />
                      <div className="leading-tight">
                        <div className="text-[12.5px] font-medium text-pri">Record session</div>
                        <div className="text-[10.5px] text-ter">enableRecording: true</div>
                      </div>
                    </div>
                    <Toggle checked={settings.record} onChange={(v) => setSettings({ record: v })} />
                  </div>

                  <div className="rounded-2xl border border-[rgb(var(--glass-edge))] bg-[rgb(var(--txt)/0.03)] px-3.5 py-2.5">
                    <div className="text-[10.5px] font-semibold tracking-[0.1em] text-ter uppercase">Provider status</div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", configError ? "bg-[#d97706]" : "bg-[#16a34a]")} />
                      <span className="truncate text-[12px] text-sec">
                        {settings.provider === "custom" ? settings.custom.name || "Custom API" : "Browser Use Cloud"}
                      </span>
                    </div>
                    {configError && (
                      <button onClick={onOpenSettings} className="mt-1 text-[11px] font-medium text-[#0b5ed7] underline-offset-2 hover:underline">
                        Finish setup →
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {settings.allowTakeover && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-start gap-2.5 rounded-2xl border border-[rgb(229_72_77/0.3)] bg-[rgb(229_72_77/0.07)] px-3.5 py-2.5"
              >
                <TriangleAlert className="mt-[1px] h-4 w-4 shrink-0 text-[#c62f34]" />
                <p className="text-[12px] leading-relaxed text-[#a33136]">
                  <b>Live control enabled.</b> You can interact with the cloud browser. Anything you type reaches a real website that
                  may be signed into live accounts.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2 px-1 text-[11px] text-ter">
            <KeyRound className="h-3 w-3" />
            <span className="truncate">
              {settings.allowDirectCalls
                ? "Direct calls enabled for local testing"
                : "All requests proxied server-side — keys never touch the browser"}
            </span>
            <span className="ml-auto hidden shrink-0 sm:inline">
              <Play className="mr-1 inline h-2.5 w-2.5" />
              Ctrl / ⌘ + Enter runs the agent
            </span>
          </div>
        </div>
      </Glass>
    );
  },
);

export default AgentForm;
