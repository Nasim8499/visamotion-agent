import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  ChevronsLeft,
  ChevronsRight,
  Info,
  ListChecks,
  LogOut,
  MessageSquare,
  Moon,
  Settings as SettingsIcon,
  Sun,
  X,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { Dot, IconBtn, Pill } from "./ui";
import { cn } from "@/utils/cn";
import { relTime, statusMeta } from "@/lib/format";
import { isBusy } from "@/lib/types";
import { LogoMark, Wordmark } from "./Lockscreen";

export type Page = "chat" | "agent" | "tasks" | "settings" | "about";

export const NAV: { id: Page; label: string; icon: typeof Bot }[] = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "agent", label: "Agent", icon: Bot },
  { id: "tasks", label: "Tasks", icon: ListChecks },
  { id: "settings", label: "Settings", icon: SettingsIcon },
  { id: "about", label: "About VisaMotion", icon: Info },
];

export default function Sidebar({
  page,
  setPage,
  collapsed,
  setCollapsed,
  onClose,
  onOpenTask,
}: {
  page: Page;
  setPage: (p: Page) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  onClose?: () => void;
  onOpenTask?: (id: string) => void;
}) {
  const { run, tasks, settings, toggleTheme, logout, pushToast } = useApp();
  const live = isBusy(run.status);
  const meta = statusMeta(run.status);

  const go = (p: Page) => {
    setPage(p);
    onClose?.();
  };

  return (
    <div className="flex h-full min-h-0 flex-col p-3">
      <div className={cn("flex items-center gap-2.5", collapsed && "justify-center")}>
        <button onClick={() => go("chat")} className="shrink-0" aria-label="VisaMotion home">
          <LogoMark size={38} />
        </button>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <Wordmark />
          </div>
        )}
        {!collapsed && onClose && (
          <button onClick={onClose} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sec hover:text-pri lg:hidden">
            <X className="h-4 w-4" />
          </button>
        )}
        {!collapsed && !onClose && (
          <IconBtn label="Collapse sidebar" onClick={() => setCollapsed(true)} className="h-8 w-8">
            <ChevronsLeft className="h-4 w-4" />
          </IconBtn>
        )}
      </div>

      <nav className={cn("mt-5 flex flex-col gap-1", collapsed && "items-center")}>
        {NAV.map((n) => {
          const active = page === n.id;
          const Icon = n.icon;
          return (
            <button
              key={n.id}
              onClick={() => go(n.id)}
              title={n.label}
              className={cn(
                "ring-focus group relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[13.5px] font-medium transition-colors",
                collapsed && "w-11 justify-center px-0",
                active ? "text-[#0b5ed7]" : "text-sec hover:text-pri",
              )}
            >
              {active && (
                <motion.span
                  layoutId="vm-nav-pill"
                  transition={{ type: "spring", stiffness: 460, damping: 38 }}
                  className="glass glass-spec absolute inset-0 rounded-2xl border-[rgb(24_119_242/0.22)] bg-[rgb(24_119_242/0.1)] shadow-[0_8px_20px_-14px_rgba(24,119,242,0.8)]"
                />
              )}
              <Icon className={cn("relative h-[17px] w-[17px] shrink-0", active && "text-[#1877f2]")} strokeWidth={active ? 2.2 : 1.9} />
              {!collapsed && <span className="relative truncate">{n.label}</span>}
              {!collapsed && n.id === "agent" && live && (
                <span className="relative ml-auto">
                  <Dot tone="blue" pulse />
                </span>
              )}
              {!collapsed && n.id === "tasks" && tasks.length > 0 && (
                <span className="relative ml-auto text-[11px] text-ter">{tasks.length}</span>
              )}
              {collapsed && n.id === "agent" && live && (
                <span className="absolute right-1 top-1">
                  <Dot tone="blue" pulse />
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {collapsed && (
        <div className="mt-3 flex justify-center">
          <IconBtn label="Expand sidebar" onClick={() => setCollapsed(false)}>
            <ChevronsRight className="h-4 w-4" />
          </IconBtn>
        </div>
      )}

      <AnimatePresence initial={false}>
        {run.task && !collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
          >
            <div className="rounded-[18px] border border-[rgb(var(--glass-edge))] bg-[rgb(var(--glass-bg-strong))] p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <Dot tone={meta.dot} pulse={live} />
                <span className="text-[10px] font-semibold tracking-[0.14em] text-ter uppercase">{live ? "Active task" : "Last task"}</span>
              </div>
              <p className="line-clamp-2 text-[12px] leading-snug text-sec">{run.task}</p>
              <div className="mt-2 h-[3px] overflow-hidden rounded-full bg-[rgb(var(--txt)/0.1)]">
                <motion.div
                  className="h-full rounded-full bg-[#1877f2]"
                  animate={{ width: `${Math.min(100, (run.step / Math.max(1, run.maxSteps)) * 100)}%` }}
                  transition={{ type: "spring", stiffness: 160, damping: 26 }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        {!collapsed && (
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[10px] font-semibold tracking-[0.14em] text-ter uppercase">Recent runs</span>
            <span className="text-[11px] text-ter">{tasks.length}</span>
          </div>
        )}
        <div className="thin-scroll mask-fade-b min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
          {!collapsed && tasks.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[rgb(var(--glass-edge))] px-3 py-5 text-center text-[11.5px] leading-relaxed text-ter">
              No runs yet.
              <br />
              Ask the agent to do something.
            </div>
          )}
          {tasks.slice(0, 12).map((t) => {
            const m = statusMeta(t.status);
            return (
              <button
                key={t.id}
                onClick={() => {
                  onOpenTask?.(t.id);
                  onClose?.();
                }}
                title={t.task}
                className={cn(
                  "group flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-[rgb(var(--txt)/0.06)]",
                  collapsed && "justify-center",
                )}
              >
                <Dot tone={m.dot} />
                {!collapsed && (
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-1 block text-[12px] text-sec group-hover:text-pri">{t.task}</span>
                    <span className="text-[10.5px] text-ter">
                      {relTime(t.createdAt)} · {m.label.toLowerCase()}
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <button
          onClick={toggleTheme}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-2xl border border-[rgb(var(--glass-edge))] bg-[rgb(var(--glass-bg-strong))] px-3 py-2.5 text-left transition-colors hover:bg-[rgb(var(--txt)/0.06)]",
            collapsed && "justify-center px-0",
          )}
          title="Toggle theme"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[rgb(24_119_242/0.12)] text-[#1877f2]">
            {settings.theme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </span>
          {!collapsed && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[12px] font-medium text-pri">{settings.theme === "light" ? "White glass" : "Blue glass"}</span>
              <span className="block text-[10.5px] text-ter">Tap to switch theme</span>
            </span>
          )}
        </button>

        {collapsed ? (
          <IconBtn label="Log out" onClick={logout} className="w-11">
            <LogOut className="h-4 w-4" />
          </IconBtn>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl border border-[rgb(var(--glass-edge))] bg-[rgb(var(--glass-bg-strong))] p-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#4a98fb,#1877f2)] text-[12px] font-semibold text-white">A</span>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[12px] font-medium text-pri">Administrator</div>
              <div className="text-[10.5px] text-ter">Local session</div>
            </div>
            <Pill
              size="sm"
              tone="ghost"
              icon={<LogOut className="h-3.5 w-3.5" />}
              onClick={() => {
                logout();
                pushToast("Signed out of VisaMotion", "ok");
              }}
              aria-label="Log out"
            >
              Log out
            </Pill>
          </div>
        )}
      </div>
    </div>
  );
}
