import PreviewDock from "@/components/PreviewDock";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Info, Menu, Moon, Sun, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Background from "@/components/Background";
import Lockscreen, { LogoMark } from "@/components/Lockscreen";
import Sidebar, { type Page } from "@/components/Sidebar";
import { Glass } from "@/components/ui";
import { AppProvider, useApp } from "@/lib/store";
import type { TaskRecord } from "@/lib/types";
import AboutPage from "@/pages/AboutPage";
import AgentPage from "@/pages/AgentPage";
import ChatPage from "@/pages/ChatPage";
import SettingsPage from "@/pages/SettingsPage";
import TasksPage from "@/pages/TasksPage";

const SIDEBAR_KEY = "visamotion:sidebar";

function Toasts() {
  const { toast } = useApp();
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[80] w-[min(92vw,440px)] -translate-x-1/2">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.94, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 14, scale: 0.96, filter: "blur(6px)" }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            className="glass glass-spec glass-strong pointer-events-auto mx-auto flex w-fit max-w-full items-center gap-2.5 rounded-full px-4 py-2.5"
          >
            {toast.tone === "ok" ? (
              <Check className="h-4 w-4 shrink-0 text-[#16a34a]" />
            ) : toast.tone === "err" ? (
              <TriangleAlert className="h-4 w-4 shrink-0 text-[#c62f34]" />
            ) : (
              <Info className="h-4 w-4 shrink-0 text-[#1877f2]" />
            )}
            <span className="line-clamp-2 text-[12.5px] font-medium text-pri">{toast.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FloatingControls() {
  const { settings, toggleTheme } = useApp();
  return (
    <motion.button
      onClick={toggleTheme}
      whileTap={{ scale: 0.9 }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 26 }}
      title={`Switch to ${settings.theme === "light" ? "blue" : "white"} glass`}
      aria-label="Toggle theme"
      className="glass glass-spec glass-strong fixed bottom-5 right-4 z-[70] grid h-12 w-12 place-items-center rounded-full text-[#1877f2] shadow-[0_16px_34px_-16px_rgba(24,119,242,0.7)] sm:bottom-6 sm:right-6"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={settings.theme}
          initial={{ opacity: 0, rotate: -60, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 60, scale: 0.6 }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          className="grid place-items-center"
        >
          {settings.theme === "light" ? <Moon className="h-[19px] w-[19px]" /> : <Sun className="h-[19px] w-[19px]" />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

function Shell() {
  const { startRun, openTask, tasks, pushToast, settings } = useApp();
  const [page, setPage] = useState<Page>("agent");
  const [task, setTask] = useState("");
  const [drawer, setDrawer] = useState(false);
  const litePage = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  const [collapsed, setCollapsed] = useState<boolean>(() => localStorage.getItem(SIDEBAR_KEY) === "1");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const goSettings = useCallback(() => {
    setPage("settings");
    setDrawer(false);
  }, []);

  const launch = useCallback(
    (t: string, immediate = false) => {
      setTask(t);
      setOpenTaskId(null);
      setPage("agent");
      if (immediate) startRun(t);
    },
    [startRun],
  );

  const continueSession = useCallback(
    (t: TaskRecord) => {
      if (!t.sessionId) {
        pushToast("This run has no session ID to continue", "err");
        return;
      }
      setTask(t.task);
      setOpenTaskId(null);
      setPage("agent");
      startRun(t.task, { sessionId: t.sessionId, parentTaskId: t.id });
    },
    [pushToast, startRun],
  );

  const openHistoryItem = useCallback(
    (id: string) => {
      const t = tasks.find((x) => x.id === id);
      if (!t) return;
      openTask(t);
      setOpenTaskId(id);
      setPage("tasks");
    },
    [openTask, tasks],
  );

  return (
    <div className="relative flex h-[100dvh] w-full overflow-hidden overflow-x-hidden">
      <Background />

      {/* Desktop / iPad fixed glass sidebar */}
      <motion.div
        animate={{ width: collapsed ? 88 : 272 }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="safe-top hidden shrink-0 p-3 md:block"
      >
        <Glass className="h-full overflow-hidden">
          <Sidebar page={page} setPage={setPage} collapsed={collapsed} setCollapsed={setCollapsed} onOpenTask={openHistoryItem} />
        </Glass>
      </motion.div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
              className="fixed inset-0 z-40 bg-[#0b1220]/30 backdrop-blur-sm md:hidden"
            />
            <motion.div
              initial={{ x: -300, opacity: 0.5 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 38 }}
              className="safe-top fixed inset-y-0 left-0 z-50 w-[282px] p-3 md:hidden"
            >
              <Glass strong className="h-full overflow-hidden">
                <Sidebar page={page} setPage={setPage} collapsed={false} setCollapsed={() => {}} onClose={() => setDrawer(false)} onOpenTask={openHistoryItem} />
              </Glass>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex min-w-0 flex-1 flex-col p-3 pt-16 md:pt-3 md:pl-0">
        {/* Floating glass menu for mobile */}
        <button
          onClick={() => setDrawer(true)}
          aria-label="Open navigation"
          className="glass glass-spec glass-strong fixed left-4 top-3 z-30 flex items-center gap-2 rounded-full py-2 pl-2 pr-3.5 text-pri md:hidden"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[rgb(24_119_242/0.1)] text-[#1877f2]">
            <Menu className="h-[17px] w-[17px]" />
          </span>
          <span className="text-[12.5px] font-semibold tracking-[-0.02em]">
            Visa<span className="text-[#1877f2]">Motion</span>
          </span>
        </button>

        <div className="fixed right-4 top-3 z-30 md:hidden">
          <button
            onClick={() => {
              setTask(tasks[0]?.task ?? "");
              setPage("agent");
              pushToast("Recent task loaded into the agent", "info");
            }}
            className="glass glass-spec glass-strong grid h-11 w-11 place-items-center rounded-full"
            aria-label="Agent"
            title="Open agent"
          >
            <LogoMark size={26} />
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={litePage ? { opacity: 0 } : { opacity: 0, y: 14, filter: "blur(10px)", scale: 0.996 }}
              animate={litePage ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 }}
              exit={litePage ? { opacity: 0 } : { opacity: 0, y: -10, filter: "blur(8px)", scale: 0.997 }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="h-full min-h-0"
            >
              {page === "agent" && <AgentPage task={task} setTask={setTask} onOpenSettings={goSettings} />}
              {page === "chat" && <ChatPage onOpenSettings={goSettings} />}
              {page === "tasks" && (
                <TasksPage onLaunch={launch} onContinue={continueSession} openTaskId={openTaskId} setOpenTaskId={setOpenTaskId} />
              )}
              {page === "settings" && <SettingsPage />}
              {page === "about" && <AboutPage setPage={setPage} onOpenSettings={goSettings} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <PreviewDock />

      <FloatingControls />
      <Toasts />
      <span className="sr-only">Theme: {settings.theme}</span>
    </div>
  );
}

function Gate() {
  const { authed } = useApp();
  const lite = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  return (
    <AnimatePresence mode="wait">
      {authed ? (
        <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: lite ? 0.25 : 0.4 }} className="h-full">
          <Shell />
        </motion.div>
      ) : (
        <motion.div key="lock" exit={lite ? { opacity: 0 } : { opacity: 0, scale: 1.02, filter: "blur(12px)" }} transition={{ duration: 0.45 }} className="h-full">
          <Background />
          <Lockscreen />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Gate />
    </AppProvider>
  );
}
