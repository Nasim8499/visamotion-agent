import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Globe,
  KeyRound,
  Layers,
  Lock,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  Zap,
} from "lucide-react";
import { LogoMark } from "@/components/Lockscreen";
import { Badge, Glass, Pill } from "@/components/ui";
import { useApp } from "@/lib/store";
import type { Page } from "@/components/Sidebar";

const CAPABILITIES = [
  { icon: Bot, title: "Live browser agent", body: "Browser Use Cloud v4 runs real Chrome sessions and streams every click, keystroke and navigation into the preview." },
  { icon: MessageSquare, title: "Gemini planning chat", body: "Chat is intentionally read-only: no tasks, no navigation, no browser control — only planning and review." },
  { icon: ShieldCheck, title: "Proxy-first security", body: "API keys stay server-side. The browser never sends a credential, and live view URLs are treated as secrets." },
  { icon: Layers, title: "Bring your own backend", body: "Switch to a custom agent API with JSON or SSE responses and the same preview, timeline and results." },
];

const STACK = ["Next.js App Router", "TypeScript", "Tailwind CSS", "Framer Motion", "Lucide", "Browser Use v4", "Gemini", "Cloudflare Workers"];

export default function AboutPage({ setPage, onOpenSettings }: { setPage: (p: Page) => void; onOpenSettings: () => void }) {
  const { settings, toggleTheme, tasks, chats } = useApp();

  return (
    <div className="thin-scroll h-full overflow-y-auto pb-16 pr-0.5">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 28 }}>
          <Glass className="relative overflow-hidden p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(24,119,242,0.18),transparent_68%)] blur-2xl" />
            <div className="relative flex flex-wrap items-center gap-4">
              <LogoMark size={62} />
              <div className="min-w-0">
                <h1 className="text-[26px] font-semibold tracking-[-0.035em] text-pri">
                  Visa<span className="text-[#1877f2]">Motion</span>
                </h1>
                <p className="mt-1 text-[13px] leading-relaxed text-ter">
                  An AI browser agent and planning chat for visa, recruitment, research and business automation.
                </p>
              </div>
              <Badge tone="blue" className="ml-auto">
                <Sparkles className="h-3 w-3" /> v2.0
              </Badge>
            </div>

            <div className="relative mt-6 grid grid-cols-3 gap-2.5">
              {[
                { label: "Agent runs", value: tasks.length },
                { label: "Conversations", value: chats.length },
                { label: "Theme", value: settings.theme === "light" ? "White" : "Blue" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-[rgb(var(--glass-edge))] bg-white/50 px-3.5 py-3">
                  <div className="text-[18px] font-semibold tracking-[-0.02em] text-pri">{s.value}</div>
                  <div className="text-[10.5px] font-medium tracking-[0.08em] text-ter uppercase">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="relative mt-5 flex flex-wrap gap-2">
              <Pill tone="primary" icon={<Bot className="h-4 w-4" />} onClick={() => setPage("agent")}>
                Start an agent task
              </Pill>
              <Pill
                tone="glass"
                icon={settings.theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                onClick={toggleTheme}
              >
                Switch to {settings.theme === "light" ? "blue" : "white"} glass
              </Pill>
              <Pill tone="ghost" icon={<KeyRound className="h-4 w-4" />} onClick={onOpenSettings}>
                API settings
              </Pill>
            </div>
          </Glass>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-2">
          {CAPABILITIES.map((c, i) => (
            <motion.div key={c.title} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, type: "spring", stiffness: 260, damping: 28 }}>
              <Glass className="h-full p-5">
                <div className="mb-3 grid h-10 w-10 place-items-center rounded-[13px] border border-[rgb(var(--glass-edge))] bg-[rgb(24_119_242/0.1)] text-[#1877f2]">
                  <c.icon className="h-[18px] w-[18px]" />
                </div>
                <h2 className="text-[14px] font-semibold tracking-[-0.015em] text-pri">{c.title}</h2>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ter">{c.body}</p>
              </Glass>
            </motion.div>
          ))}
        </div>

        <Glass className="p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <Lock className="h-4 w-4 text-[#1877f2]" />
            <h2 className="text-[14.5px] font-semibold tracking-[-0.015em] text-pri">Security & access</h2>
          </div>
          <div className="space-y-2.5 text-[12.5px] leading-relaxed text-sec">
            {[
              "Single-admin access: the workspace unlocks with one password and stores a local session (remember-device optional).",
              "All third-party calls (Browser Use, custom agent, Gemini) are proxied so API keys never appear in browser requests.",
              "Live view and CDP URLs are credentials — read-only mode appends readOnly=true and human takeover warns before enabling control.",
              "Keys are masked as ****1234 in Settings and never written to logs.",
            ].map((t) => (
              <div key={t} className="flex gap-2.5">
                <ShieldCheck className="mt-[2px] h-3.5 w-3.5 shrink-0 text-[#16a34a]" />
                <p>{t}</p>
              </div>
            ))}
          </div>
        </Glass>

        <Glass className="p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2.5">
            <Zap className="h-4 w-4 text-[#1877f2]" />
            <h2 className="text-[14.5px] font-semibold tracking-[-0.015em] text-pri">Built with</h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STACK.map((s) => (
              <Badge key={s} tone="neutral">{s}</Badge>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Pill tone="glass" size="sm" icon={<Globe className="h-3.5 w-3.5" />} onClick={onOpenSettings}>
              Deployment & proxy routes
            </Pill>
            <Pill tone="ghost" size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => setPage("tasks")}>
              View task history
            </Pill>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-ter">
            VisaMotion runs locally (npm run dev) and deploys to Cloudflare Workers through the OpenNext adapter. Environment secrets:
            ADMIN_PASSWORD, BROWSER_USE_API_KEY, GEMINI_API_KEY, CUSTOM_AGENT_API_KEY, CUSTOM_AGENT_BASE_URL.
          </p>
        </Glass>
      </div>
    </div>
  );
}
