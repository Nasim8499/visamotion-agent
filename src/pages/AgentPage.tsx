import { AnimatePresence } from "framer-motion";
import { Activity } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ActivityFeed from "@/components/ActivityFeed";
import AgentForm, { type AgentFormHandle } from "@/components/AgentForm";
import LivePreview from "@/components/LivePreview";
import { BottomSheet, Dot } from "@/components/ui";
import { statusMeta } from "@/lib/format";
import { useApp } from "@/lib/store";
import { isBusy } from "@/lib/types";

export default function AgentPage({
  task,
  setTask,
  onOpenSettings,
}: {
  task: string;
  setTask: (v: string) => void;
  onOpenSettings: () => void;
}) {
  const { startRun, run, events } = useApp();
  const [sheet, setSheet] = useState(false);
  const formRef = useRef<AgentFormHandle>(null);
  const busy = isBusy(run.status);
  const meta = statusMeta(run.status);

  /* Cmd/Ctrl+K focuses the task input, Cmd/Ctrl+Enter runs it. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const metaKey = e.metaKey || e.ctrlKey;
      if (metaKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        formRef.current?.focus();
      }
      if (metaKey && e.key === "Enter") {
        e.preventDefault();
        if (task.trim() && !busy) startRun(task);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, startRun, task]);

  return (
    <div className="thin-scroll flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-0.5 xl:flex-row xl:overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <AgentForm ref={formRef} task={task} setTask={setTask} onOpenSettings={onOpenSettings} />
        <div className="flex min-h-[430px] flex-1 flex-col">
          <LivePreview onOpenSettings={onOpenSettings} />
        </div>
      </div>

      <aside className="hidden w-[336px] shrink-0 xl:block">
        <ActivityFeed onOpenSettings={onOpenSettings} />
      </aside>

      <aside className="hidden h-[420px] w-full shrink-0 md:block xl:hidden">
        <ActivityFeed onOpenSettings={onOpenSettings} />
      </aside>

      <button
        onClick={() => setSheet(true)}
        className="glass glass-spec sticky bottom-2 z-30 flex items-center gap-2.5 rounded-full px-4 py-3 md:hidden"
      >
        <Activity className="h-4 w-4 text-[#1877f2]" />
        <span className="text-[13px] font-medium text-pri">Activity</span>
        <span className="text-[12px] text-ter">{events.length}</span>
        <span className="ml-auto flex items-center gap-1.5">
          <Dot tone={meta.dot} pulse={busy} />
          <span className="text-[12px] text-sec">{meta.label}</span>
        </span>
      </button>

      <AnimatePresence>
        {sheet && (
          <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Agent activity">
            <div className="h-[64vh] px-2 pb-2">
              <ActivityFeed onOpenSettings={onOpenSettings} />
            </div>
          </BottomSheet>
        )}
      </AnimatePresence>
    </div>
  );
}
