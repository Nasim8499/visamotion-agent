import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  History,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  ShieldOff,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "@/components/Markdown";
import { Badge, ErrorState, Glass, IconBtn, Pill, Select } from "@/components/ui";
import { chatConfigError, streamGemini } from "@/lib/gemini";
import { useApp } from "@/lib/store";
import { uid } from "@/lib/storage";
import { CHAT_SUGGESTIONS, GEMINI_MODELS, type ChatMessage } from "@/lib/types";
import { relTime } from "@/lib/format";
import { cn } from "@/utils/cn";
import { LogoMark } from "@/components/Lockscreen";

function Bubble({ m, streaming, onRegenerate }: { m: ChatMessage; streaming?: boolean; onRegenerate?: () => void }) {
  const [copied, setCopied] = useState(false);
  const mine = m.role === "user";
  const copy = () => {
    const done = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(m.content).then(done).catch(done);
    else done();
  };

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className={cn("group flex w-full gap-3", mine ? "justify-end" : "justify-start")}
    >
      {!mine && (
        <div className="mt-0.5 shrink-0">
          <LogoMark size={30} />
        </div>
      )}
      <div className={cn("max-w-[86%] sm:max-w-[76%]", mine && "flex flex-col items-end")}>
        <div
          className={cn(
            "relative rounded-[20px] px-4 py-3 text-[14px] leading-relaxed tracking-[-0.005em]",
            mine
              ? "bg-[linear-gradient(180deg,#3b8ef8,#1877f2)] text-white shadow-[0_10px_24px_-14px_rgba(24,119,242,0.9),inset_0_1px_0_rgba(255,255,255,0.35)]"
              : m.error
                ? "border border-[rgb(229_72_77/0.3)] bg-[rgb(229_72_77/0.07)]"
                : "glass glass-spec",
          )}
        >
          {mine ? (
            <p className="whitespace-pre-wrap break-words">{m.content}</p>
          ) : m.content ? (
            <Markdown text={m.content} />
          ) : (
            <span className="inline-flex items-center gap-2 text-[13px] text-ter">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#1877f2]" /> Gemini is thinking…
            </span>
          )}
          {streaming && m.content && <motion.span className="ml-0.5 inline-block h-[13px] w-[2.5px] translate-y-[2px] rounded-full bg-[#1877f2]" animate={{ opacity: [1, 0.15, 1] }} transition={{ duration: 1, repeat: Infinity }} />}
        </div>
        {!mine && m.content && !streaming && (
          <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <button onClick={copy} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-ter hover:text-sec">
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? "Copied" : "Copy"}
            </button>
            {onRegenerate && (
              <button onClick={onRegenerate} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-ter hover:text-sec">
                <RefreshCw className="h-3 w-3" /> Regenerate
              </button>
            )}
          </div>
        )}
        {m.stopped && <span className="mt-1 text-[10.5px] text-ter">generation stopped</span>}
      </div>
    </motion.div>
  );
}

export default function ChatPage({ onOpenSettings }: { onOpenSettings: () => void }) {
  const {
    chats, activeChat, activeChatId, newChat, selectChat, deleteChat, clearAllChats, patchThread,
    settings, setSettings, pushToast, tasks,
  } = useApp();
  const [input, setInput] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const cfgError = chatConfigError(settings);
  const messages = activeChat?.messages ?? [];

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, activeChatId]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const generate = useCallback(
    async (threadId: string, prompt: string, history: ChatMessage[], replyId: string) => {
      setBusyId(replyId);
      setFatal(null);
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      const patch = (fn: (prev: string) => string, extra: Partial<ChatMessage> = {}) =>
        patchThread(threadId, (t) => ({
          ...t,
          updatedAt: Date.now(),
          messages: t.messages.map((m) => (m.id === replyId ? { ...m, content: fn(m.content), ...extra } : m)),
        }));

      try {
        await streamGemini(settings, history, prompt, (d) => patch((p) => p + d), ctrl.signal);
      } catch (e) {
        if (ctrl.signal.aborted) patch((p) => p || "_(stopped)_", { stopped: true, error: false });
        else {
          const msg = e instanceof Error ? e.message : "Chat request failed.";
          setFatal(msg);
          patchThread(threadId, (t) => ({ ...t, messages: t.messages.filter((m) => m.id !== replyId) }));
          pushToast("Gemini request failed", "err");
        }
      } finally {
        setBusyId(null);
        abortRef.current = null;
      }
    },
    [patchThread, pushToast, settings],
  );

  const send = useCallback(
    (raw?: string) => {
      let prompt = (raw ?? input).trim();
      if (!prompt || busyId) return;

      // "Summarize the last agent result" needs real context — attach the latest run.
      if (/summarize the last agent result/i.test(prompt)) {
        const last = tasks[0];
        prompt = last
          ? `Summarise the result of my last browser-agent run.\n\nTask: ${last.task}\nStatus: ${last.status}\nSteps: ${last.steps}\nResult:\n${last.output ?? last.error ?? "No result was recorded."}`
          : `${prompt}\n\n(No agent runs exist yet on this device — say so and explain what I should run first.)`;
      }

      setInput("");
      let threadId = activeChatId;
      if (!threadId || !activeChat) threadId = newChat();
      const history = messages;
      const replyId = uid("m");
      patchThread(threadId, (t) => ({
        ...t,
        title: t.messages.length ? t.title : prompt.slice(0, 52),
        updatedAt: Date.now(),
        messages: [
          ...t.messages,
          { id: uid("m"), role: "user", content: prompt, ts: Date.now() },
          { id: replyId, role: "assistant", content: "", ts: Date.now() },
        ],
      }));
      void generate(threadId, prompt, history, replyId);
    },
    [activeChat, activeChatId, busyId, generate, input, messages, newChat, patchThread, tasks],
  );

  const regenerate = useCallback(
    (assistantId: string) => {
      if (busyId || !activeChat) return;
      const idx = messages.findIndex((m) => m.id === assistantId);
      if (idx < 1) return;
      const prompt = messages[idx - 1]?.content ?? "";
      const history = messages.slice(0, idx - 1);
      const threadId = activeChat.id;
      patchThread(threadId, (t) => ({
        ...t,
        messages: t.messages.map((m) => (m.id === assistantId ? { ...m, content: "", error: false, stopped: false, ts: Date.now() } : m)),
      }));
      void generate(threadId, prompt, history, assistantId);
    },
    [activeChat, busyId, generate, messages, patchThread],
  );

  const retryLast = useCallback(() => {
    if (!activeChat) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    const idx = messages.indexOf(lastUser);
    const replyId = uid("m");
    patchThread(activeChat.id, (t) => ({
      ...t,
      messages: [...t.messages.slice(0, idx + 1), { id: replyId, role: "assistant", content: "", ts: Date.now() }],
    }));
    void generate(activeChat.id, lastUser.content, messages.slice(0, idx), replyId);
  }, [activeChat, generate, messages, patchThread]);

  const lastAssistantId = [...messages].reverse().find((m) => m.role === "assistant")?.id;

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-3">
      <Glass className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4">
        <div className="relative">
          <button onClick={() => setHistoryOpen((o) => !o)} className="flex items-center gap-2 rounded-full border border-[rgb(var(--glass-edge))] bg-[rgb(var(--glass-bg-strong))] px-3 py-2 text-[12.5px] font-medium text-pri hover:bg-white/80">
            <History className="h-4 w-4 text-[#1877f2]" />
            <span className="hidden sm:inline">History</span>
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", historyOpen && "rotate-180")} />
          </button>
          {historyOpen && <button aria-hidden onClick={() => setHistoryOpen(false)} className="fixed inset-0 z-30 cursor-default" tabIndex={-1} />}
          <AnimatePresence>
            {historyOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                className="glass glass-spec glass-strong absolute left-0 top-[calc(100%+8px)] z-40 w-[290px] rounded-[22px] p-2"
              >
                <div className="mb-1 flex items-center justify-between px-2 py-1">
                  <span className="text-[10.5px] font-semibold tracking-[0.12em] text-ter uppercase">Conversations</span>
                  {chats.length > 0 && (
                    <button
                      onClick={() => {
                        clearAllChats();
                        pushToast("Chat history cleared", "ok");
                        setHistoryOpen(false);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-[#c62f34] hover:underline"
                    >
                      <Trash2 className="h-3 w-3" /> Clear all
                    </button>
                  )}
                </div>
                <div className="thin-scroll max-h-64 space-y-0.5 overflow-y-auto">
                  {chats.length === 0 && <p className="px-2 py-4 text-center text-[12px] text-ter">No saved conversations.</p>}
                  {chats.map((c) => (
                    <div key={c.id} className={cn("group flex items-center gap-1 rounded-xl", c.id === activeChatId && "bg-[rgb(24_119_242/0.08)]")}>
                      <button
                        onClick={() => {
                          selectChat(c.id);
                          setHistoryOpen(false);
                        }}
                        className="min-w-0 flex-1 px-2.5 py-2 text-left"
                      >
                        <span className="line-clamp-1 block text-[12.5px] text-pri">{c.title || "New chat"}</span>
                        <span className="text-[10.5px] text-ter">{relTime(c.updatedAt)} · {c.messages.length} messages</span>
                      </button>
                      <button onClick={() => deleteChat(c.id)} className="mr-1 rounded-full p-1.5 text-ter opacity-0 hover:text-[#c62f34] group-hover:opacity-100" aria-label="Delete conversation">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <Pill tone="primary" size="sm" icon={<MessageSquarePlus className="h-3.5 w-3.5" />} onClick={() => { newChat(); setFatal(null); pushToast("Started a new chat", "ok"); }}>
          New chat
        </Pill>

        <Badge tone="blue" className="hidden sm:inline-flex">
          <ShieldOff className="h-3 w-3" /> Chat only — browser automation disabled
        </Badge>

        <div className="ml-auto flex items-center gap-1.5">
          <Select className="w-[152px] sm:w-[170px]" value={settings.geminiModel} onChange={(v) => setSettings({ geminiModel: v })} options={GEMINI_MODELS} />
          <IconBtn label="Settings" onClick={onOpenSettings} className="hidden sm:grid">
            <Sparkles className="h-4 w-4" />
          </IconBtn>
        </div>
      </Glass>

      <Badge tone="blue" className="self-center sm:hidden">
        <ShieldOff className="h-3 w-3" /> Chat only — browser automation disabled
      </Badge>

      <Glass className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div ref={scrollRef} className="thin-scroll min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.length === 0 ? (
            <div className="flex min-h-full flex-col items-center justify-center text-center">
              <div className="mb-4">
                <LogoMark size={54} />
              </div>
              <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-pri">How can I help?</h1>
              <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ter">
                Plan agent tasks, draft visa and recruitment research prompts, or review a previous run. Chat can never open or control a
                browser.
              </p>
              <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                {CHAT_SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="pill-press rounded-2xl border border-[rgb(var(--glass-edge))] bg-[rgb(var(--glass-bg-strong))] px-4 py-3 text-left text-[12.5px] leading-snug text-sec transition-colors hover:text-pri hover:shadow-sm">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <Bubble key={m.id} m={m} streaming={busyId === m.id} onRegenerate={m.id === lastAssistantId && m.role === "assistant" ? () => regenerate(m.id) : undefined} />
                ))}
              </AnimatePresence>
            </div>
          )}
          {fatal && (
            <div className="mx-auto mt-4 max-w-3xl">
              <ErrorState compact title="Gemini request failed" message={fatal} onRetry={retryLast} secondary={<Pill tone="ghost" size="sm" onClick={onOpenSettings}>Settings</Pill>} />
            </div>
          )}
        </div>

        <div className="safe-bottom shrink-0 border-t border-[rgb(var(--glass-edge))] p-3 sm:p-4">
          {cfgError && (
            <button onClick={onOpenSettings} className="mb-2.5 flex w-full items-center gap-2 rounded-2xl border border-[rgb(245_158_11/0.3)] bg-[rgb(245_158_11/0.08)] px-3.5 py-2 text-left text-[11.5px] leading-relaxed text-[#a16207]">
              {cfgError} <span className="ml-auto shrink-0 font-medium">Fix →</span>
            </button>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Ask anything — never a browser action…"
              className="ring-focus max-h-40 min-h-[50px] flex-1 resize-none rounded-[24px] border border-[rgb(var(--glass-edge))] bg-[rgb(var(--glass-bg-strong))] px-5 py-3.5 text-[14.5px] leading-relaxed text-pri placeholder:text-ter backdrop-blur-xl"
            />
            {busyId ? (
              <Pill tone="danger" size="lg" icon={<Square className="h-3.5 w-3.5 fill-current" />} onClick={() => abortRef.current?.abort()}>
                Stop
              </Pill>
            ) : (
              <Pill tone="primary" size="lg" disabled={!input.trim()} onClick={() => send()} className="aspect-square px-0!" aria-label="Send message">
                <ArrowUp className="h-5 w-5" />
              </Pill>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2 px-2 text-[10.5px] text-ter">
            <ShieldOff className="h-3 w-3" />
            <span>{settings.geminiModel} · history on this device · browser control disabled</span>
            <button
              onClick={() => {
                clearAllChats();
                pushToast("Chat history cleared", "ok");
              }}
              className="ml-auto inline-flex items-center gap-1 hover:text-[#c62f34]"
            >
              <Trash2 className="h-3 w-3" /> Clear history
            </button>
          </div>
        </div>
      </Glass>
    </div>
  );
}
