import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { makeEvent, runBrowserUse, runCustom, type RunCallbacks, type RunnerHandle, type RunPatch } from "./api";
import { clearSession, readSession, serverLogout, verifyPassword, writeSession } from "./auth";
import { load, save, uid } from "./storage";
import {
  DEFAULT_CUSTOM,
  DEFAULT_SETTINGS,
  isBusy,
  type AgentEvent,
  type ChatThread,
  type CustomProviderConfig,
  type RunState,
  type Settings,
  type TaskRecord,
  type Theme,
} from "./types";

const EMPTY_RUN: RunState = {
  taskId: null,
  runId: null,
  sessionId: null,
  liveViewUrl: null,
  status: "idle",
  startedAt: null,
  finishedAt: null,
  step: 0,
  maxSteps: 25,
  task: "",
  output: null,
  structured: null,
  recordingUrl: null,
  error: null,
  errorHint: null,
  humanTakeover: false,
  provider: "browser-use",
};

export interface StartOptions {
  sessionId?: string | null;
  parentTaskId?: string | null;
}

interface Ctx {
  authed: boolean;
  unlock: (password: string, remember: boolean) => Promise<boolean>;
  logout: () => void;
  settings: Settings;
  setSettings: (p: Partial<Settings>) => void;
  setCustom: (p: Partial<CustomProviderConfig>) => void;
  toggleTheme: () => void;
  run: RunState;
  events: AgentEvent[];
  tasks: TaskRecord[];
  startRun: (task: string, opts?: StartOptions) => void;
  retryRun: () => void;
  stopRun: () => void;
  resetRun: () => void;
  removeTask: (id: string) => void;
  clearTasks: () => void;
  openTask: (t: TaskRecord) => void;
  chats: ChatThread[];
  activeChatId: string | null;
  activeChat: ChatThread | null;
  newChat: () => string;
  selectChat: (id: string) => void;
  deleteChat: (id: string) => void;
  clearAllChats: () => void;
  patchThread: (id: string, updater: (t: ChatThread) => ChatThread) => void;
  configError: string | null;
  toast: { id: string; text: string; tone: "ok" | "err" | "info" } | null;
  pushToast: (text: string, tone?: "ok" | "err" | "info") => void;
}

const AppCtx = createContext<Ctx | null>(null);

export function validateProvider(s: Settings): string | null {
  if (s.provider === "browser-use") {
    if (s.allowDirectCalls && !s.browserUseKey.trim()) return "No Browser Use API key. Add it in Settings → Browser Use API.";
    if (!s.allowDirectCalls && !s.browserUseKey.trim() && !s.proxyBase.trim()) {
      return "No Browser Use API key saved and no backend proxy configured. Add your key in Settings → Browser Use API, or point the app at the deployed proxy that holds BROWSER_USE_API_KEY server-side.";
    }
    return null;
  }
  if (!s.custom.enabled) return "The Custom Agent API is disabled. Enable it in Settings → Custom Agent API.";
  if (!s.custom.baseUrl.trim()) return "The Custom Agent API has no Base URL. Add it in Settings → Custom Agent API.";
  return null;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean>(() => !!readSession());
  const [settings, setSettingsState] = useState<Settings>(() => {
    const loaded = load<Settings>("settings", DEFAULT_SETTINGS);
    const merged = { ...DEFAULT_SETTINGS, ...loaded, custom: { ...DEFAULT_CUSTOM, ...(loaded.custom ?? {}) } };
    if (merged.theme !== "light" && merged.theme !== "blue") merged.theme = "light";
    return merged;
  });
  const [run, setRun] = useState<RunState>(EMPTY_RUN);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [previewDock, setPreviewDock] = useState(false);
  const togglePreviewDock = useCallback(() => setPreviewDock((v) => !v), []);
  const [tasks, setTasks] = useState<TaskRecord[]>(() => load<TaskRecord[]>("tasks", []));
  const [chats, setChats] = useState<ChatThread[]>(() => load<ChatThread[]>("chats", []));
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [toast, setToast] = useState<Ctx["toast"]>(null);

  const handle = useRef<RunnerHandle | null>(null);
  const activeTaskId = useRef<string | null>(null);
  const lastStart = useRef<{ task: string; opts: StartOptions } | null>(null);
  const eventBuffer = useRef<AgentEvent[]>([]);

  useEffect(() => save("settings", settings), [settings]);
  useEffect(() => save("tasks", tasks.slice(0, 60)), [tasks]);
  useEffect(() => save("chats", chats.slice(0, 40)), [chats]);

  /* theme */
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("blue", settings.theme === "blue");
    root.classList.toggle("light", settings.theme === "light");
    root.style.colorScheme = "light";
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", settings.theme === "blue" ? "#1877f2" : "#f4f7fd");
  }, [settings.theme]);

  useEffect(() => () => handle.current?.abort(), []);

  const setSettings = useCallback((p: Partial<Settings>) => setSettingsState((s) => ({ ...s, ...p })), []);
  const setCustom = useCallback(
    (p: Partial<CustomProviderConfig>) => setSettingsState((s) => ({ ...s, custom: { ...s.custom, ...p } })),
    [],
  );
  const toggleTheme = useCallback(
    () =>
      setSettingsState((s) => {
        const theme: Theme = s.theme === "light" ? "blue" : "light";
        return { ...s, theme };
      }),
    [],
  );

  const pushToast = useCallback((text: string, tone: "ok" | "err" | "info" = "info") => {
    const id = uid("t");
    setToast({ id, text, tone });
    window.setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 4800);
  }, []);

  /* ---------------- auth ---------------- */

  const unlock = useCallback(
    async (password: string, remember: boolean) => {
      const ok = await verifyPassword(password, settings.proxyBase);
      if (!ok) return false;
      writeSession(remember);
      setAuthed(true);
      return true;
    },
    [settings.proxyBase],
  );

  const logout = useCallback(() => {
    handle.current?.abort();
    handle.current = null;
    clearSession();
    void serverLogout(settings.proxyBase);
    setAuthed(false);
    setActiveChatId(null);
  }, [settings.proxyBase]);

  /* ---------------- chats ---------------- */

  const newChat = useCallback(() => {
    const id = uid("chat");
    setChats((l) => [{ id, title: "New chat", createdAt: Date.now(), updatedAt: Date.now(), messages: [] }, ...l]);
    setActiveChatId(id);
    return id;
  }, []);

  const patchThread = useCallback((id: string, updater: (t: ChatThread) => ChatThread) => {
    setChats((list) => list.map((t) => (t.id === id ? updater(t) : t)));
  }, []);

  const selectChat = useCallback((id: string) => setActiveChatId(id), []);
  const deleteChat = useCallback((id: string) => {
    setChats((l) => l.filter((t) => t.id !== id));
    setActiveChatId((cur) => (cur === id ? null : cur));
  }, []);
  const clearAllChats = useCallback(() => {
    setChats([]);
    setActiveChatId(null);
  }, []);

  const activeChat = useMemo(() => chats.find((c) => c.id === activeChatId) ?? null, [activeChatId, chats]);

  /* ---------------- tasks ---------------- */

  const removeTask = useCallback((id: string) => setTasks((l) => l.filter((t) => t.id !== id)), []);
  const clearTasks = useCallback(() => setTasks([]), []);

  const patchTask = useCallback((id: string, fn: (t: TaskRecord) => TaskRecord) => {
    setTasks((list) => list.map((t) => (t.id === id ? fn(t) : t)));
  }, []);

  const applyPatch = useCallback(
    (p: RunPatch) => {
      setRun((r) => {
        const next = { ...r, ...p } as RunState;
        if (p.status && (p.status === "completed" || p.status === "failed" || p.status === "stopped")) next.finishedAt = Date.now();
        return next;
      });
      const id = activeTaskId.current;
      if (!id) return;
      patchTask(id, (t) => {
        const ended = p.status && (p.status === "completed" || p.status === "failed" || p.status === "stopped") ? Date.now() : t.endedAt;
        return {
          ...t,
          runId: p.runId !== undefined ? p.runId : t.runId,
          sessionId: p.sessionId !== undefined ? (p.sessionId ?? t.sessionId) : t.sessionId,
          liveViewUrl: p.liveViewUrl !== undefined ? (p.liveViewUrl ?? t.liveViewUrl) : t.liveViewUrl,
          status: p.status ?? t.status,
          output: p.output !== undefined ? p.output : t.output,
          structured: p.structured !== undefined ? p.structured : t.structured,
          recordingUrl: p.recordingUrl !== undefined ? (p.recordingUrl ?? t.recordingUrl) : t.recordingUrl,
          error: p.error !== undefined ? p.error : t.error,
          steps: p.step ?? t.steps,
          endedAt: ended ?? null,
          durationMs: ended ? ended - t.createdAt : t.durationMs,
          events: eventBuffer.current.slice(-200),
        };
      });
    },
    [patchTask],
  );

  const pushEvent = useCallback(
    (e: AgentEvent) => {
      // SSE + polling can replay the same upstream event — de-duplicate by a
      // stable fingerprint so the timeline never shows the same action twice.
      const fingerprint = `${e.kind}|${e.ts}|${e.message}|${e.detail ?? ""}`;
      const exists = eventBuffer.current.some(
        (x) => `${x.kind}|${x.ts}|${x.message}|${x.detail ?? ""}` === fingerprint,
      );
      if (exists) return;
      eventBuffer.current = [...eventBuffer.current, e].slice(-400);
      setEvents(eventBuffer.current);
      const id = activeTaskId.current;
      if (id) patchTask(id, (t) => ({ ...t, events: eventBuffer.current.slice(-200) }));
    },
    [patchTask],
  );

  const startRun = useCallback(
    (task: string, opts: StartOptions = {}) => {
      if (!authed) {
        pushToast("Session locked — unlock VisaMotion first", "err");
        return;
      }
      const trimmed = task.trim();
      if (!trimmed) {
        pushToast("Describe a task before running the agent", "err");
        return;
      }
      lastStart.current = { task: trimmed, opts };
      handle.current?.abort();

      const configError = validateProvider(settings);
      const followUp = !!opts.sessionId;
      const taskId = uid("task");
      activeTaskId.current = taskId;
      eventBuffer.current = followUp ? eventBuffer.current.slice(-80) : [];
      setEvents(eventBuffer.current);

      setRun({
        ...EMPTY_RUN,
        taskId,
        task: trimmed,
        provider: settings.provider,
        maxSteps: settings.maxSteps,
        humanTakeover: settings.allowTakeover,
        status: configError ? "failed" : "starting",
        startedAt: Date.now(),
        finishedAt: configError ? Date.now() : null,
        sessionId: opts.sessionId ?? null,
        error: configError,
        errorHint: configError ? "settings" : null,
      });

      const record: TaskRecord = {
        id: taskId,
        owner: "admin",
        runId: null,
        sessionId: opts.sessionId ?? null,
        task: trimmed,
        startUrl: settings.startUrl.trim() || null,
        provider: settings.provider,
        status: configError ? "failed" : "starting",
        createdAt: Date.now(),
        endedAt: configError ? Date.now() : null,
        durationMs: null,
        steps: 0,
        output: null,
        structured: null,
        recordingUrl: null,
        liveViewUrl: null,
        error: configError,
        parentTaskId: opts.parentTaskId ?? null,
        events: [],
      };
      setTasks((l) => [record, ...l]);

      if (configError) {
        pushEvent(makeEvent("run.failed", "Cannot start run", { detail: configError }));
        pushToast(configError, "err");
        return;
      }
      if (followUp) pushEvent(makeEvent("system", "Follow-up task", { detail: `Reusing session ${opts.sessionId}` }));

      const cb: RunCallbacks = { onEvent: pushEvent, onPatch: applyPatch };
      handle.current =
        settings.provider === "custom"
          ? runCustom(
              settings,
              {
                task: trimmed,
                startUrl: settings.startUrl.trim() || undefined,
                maxSteps: settings.maxSteps,
                record: settings.record,
                model: settings.model,
                sessionId: opts.sessionId ?? null,
                keepAlive: settings.keepAlive,
              },
              cb,
            )
          : runBrowserUse(
              settings,
              {
                task: trimmed,
                startUrl: settings.startUrl.trim() || undefined,
                maxSteps: settings.maxSteps,
                record: settings.record,
                model: settings.model,
                sessionId: opts.sessionId ?? null,
                keepAlive: settings.keepAlive,
              },
              cb,
            );
    },
    [applyPatch, authed, pushEvent, pushToast, settings],
  );

  const retryRun = useCallback(() => {
    if (!lastStart.current) {
      pushToast("No run to retry yet", "err");
      return;
    }
    startRun(lastStart.current.task, lastStart.current.opts);
  }, [pushToast, startRun]);

  const stopRun = useCallback(() => {
    if (!handle.current) {
      pushToast("No active session to stop", "err");
      return;
    }
    setRun((r) => ({ ...r, status: "stopping" }));
    handle.current.stop().finally(() => {
      applyPatch({ status: "stopped" });
      pushEvent(makeEvent("system", "Session stopped", { detail: "Cloud browser released" }));
      pushToast("Session stopped", "ok");
    });
  }, [applyPatch, pushEvent, pushToast]);

  const resetRun = useCallback(() => {
    handle.current?.abort();
    handle.current = null;
    activeTaskId.current = null;
    eventBuffer.current = [];
    setEvents([]);
    setRun(EMPTY_RUN);
  }, []);

  const openTask = useCallback((t: TaskRecord) => {
    handle.current?.abort();
    handle.current = null;
    activeTaskId.current = null;
    eventBuffer.current = t.events ?? [];
    setEvents(eventBuffer.current);
    setRun({
      ...EMPTY_RUN,
      taskId: t.id,
      runId: t.runId,
      sessionId: t.sessionId,
      liveViewUrl: t.liveViewUrl,
      status: isBusy(t.status) ? "stopped" : t.status,
      startedAt: t.createdAt,
      finishedAt: t.endedAt,
      step: t.steps,
      task: t.task,
      output: t.output,
      structured: t.structured,
      recordingUrl: t.recordingUrl,
      error: t.error,
      provider: t.provider,
    });
  }, []);

  const configError = useMemo(() => validateProvider(settings), [settings]);

  const value = useMemo<Ctx>(
    () => ({
      authed,
      unlock,
      logout,
      settings,
      setSettings,
      setCustom,
      toggleTheme,
      run,
      events,
      tasks,
      startRun,
      previewDock,
      togglePreviewDock,
      retryRun,
      stopRun,
      resetRun,
      removeTask,
      clearTasks,
      openTask,
      chats,
      activeChatId,
      activeChat,
      newChat,
      selectChat,
      deleteChat,
      clearAllChats,
      patchThread,
      configError,
      toast,
      pushToast,
    }),
    [
      authed, unlock, logout, settings, setSettings, setCustom, toggleTheme, run, events, tasks, startRun, previewDock, togglePreviewDock,
      retryRun, stopRun, resetRun, removeTask, clearTasks, openTask, chats, activeChatId, activeChat,
      newChat, selectChat, deleteChat, clearAllChats, patchThread, configError, toast, pushToast,
    ],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
