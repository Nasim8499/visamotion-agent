import { motion } from "framer-motion";
import { ArrowRight, Check, Eye, EyeOff, KeyRound, Loader2, Lock, Moon, ShieldCheck, Sun, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { Pill, Shine, Toggle } from "./ui";
import { cn } from "@/utils/cn";

export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <div
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-[15px] bg-[linear-gradient(145deg,#4a98fb_0%,#1877f2_48%,#0b5ed7_100%)] shadow-[0_10px_26px_-10px_rgba(24,119,242,0.9),inset_0_1px_0_rgba(255,255,255,0.55)]"
      style={{ width: size, height: size }}
    >
      <div className="absolute -top-3 left-0 h-6 w-14 rotate-[-20deg] bg-white/35 blur-[6px]" />
      <svg viewBox="0 0 24 24" className="relative text-white" style={{ width: size * 0.56, height: size * 0.56 }} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.5 3.5 12 20.5 19.5 3.5" />
        <path d="M8 9.5h8" />
      </svg>
    </div>
  );
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <div className="leading-none">
      <div className={cn("text-[15.5px] font-semibold tracking-[-0.03em]", light ? "text-white" : "text-pri")}>
        Visa<span className="text-[#1877f2]">Motion</span>
      </div>
      <div className={cn("mt-[3px] text-[9.5px] font-semibold tracking-[0.22em] uppercase", light ? "text-white/60" : "text-ter")}>
        AI Browser Agent
      </div>
    </div>
  );
}

export default function Lockscreen() {
  const { unlock, settings, toggleTheme, pushToast } = useApp();
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // On phones/tablets: don't auto-focus — the on-screen keyboard would jump up
    // and squash the layout the moment the page opens. User taps the field instead.
    const touch = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
    if (touch) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 450);
    return () => window.clearTimeout(t);
  }, []);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError(null);
    const ok = await unlock(password, remember);
    if (ok) {
      setSuccess(true);
      pushToast("Welcome back, admin", "ok");
      return;
    }
    setLoading(false);
    setPassword("");
    setError("Incorrect password.");
    setShake((s) => s + 1);
    window.setTimeout(() => inputRef.current?.focus(), 120);
  };

  return (
    <div className="safe-top safe-bottom relative flex min-h-[100dvh] w-full flex-col overflow-y-auto overflow-x-hidden px-5 py-6 [scrollbar-gutter:stable]">
      {/* header */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LogoMark size={40} />
          <Wordmark />
        </div>
        <Pill
          tone="glass"
          size="sm"
          onClick={toggleTheme}
          icon={settings.theme === "light" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        >
          <span className="hidden sm:inline">{settings.theme === "light" ? "White glass" : "Blue glass"}</span>
        </Pill>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center py-8">
        <motion.div
          initial={{ opacity: 0, y: 26, scale: 0.97, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="w-full max-w-[430px]"
        >
          <div className="glass glass-spec glass-sheen relative overflow-hidden rounded-[34px] p-7 sm:p-9">
            <div className="relative flex flex-col items-center text-center">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="relative mb-5"
              >
                <div className="absolute -inset-4 rounded-[30px] bg-[radial-gradient(circle,rgba(24,119,242,0.28),transparent_68%)] blur-xl" />
                <LogoMark size={64} />
                <span className="absolute -bottom-1.5 -right-1.5 grid h-7 w-7 place-items-center rounded-full border border-white/80 bg-white/90 shadow-[0_6px_14px_-6px_rgba(19,42,82,0.5)] backdrop-blur">
                  <Lock className="h-3.5 w-3.5 text-[#1877f2]" />
                </span>
              </motion.div>

              <h1 className="text-[27px] font-semibold tracking-[-0.035em] text-pri">
                Visa<span className="text-[#1877f2]">Motion</span>
              </h1>
              <p className="mt-1.5 max-w-[280px] text-[13px] leading-relaxed text-ter">
                Admin access to your AI browser agent, chat and task workspace.
              </p>
            </div>

            <motion.form
              key={shake}
              onSubmit={submit}
              animate={shake > 0 ? { x: [0, -11, 11, -8, 8, -4, 4, 0] } : {}}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="relative mt-7"
            >
              <div
                className={cn(
                  "flex items-center gap-2.5 rounded-2xl border bg-[rgb(var(--field))] px-4 backdrop-blur-xl transition-colors",
                  error ? "border-[rgb(229_72_77/0.55)]" : "border-[rgb(var(--glass-edge))]",
                )}
              >
                <KeyRound className="h-4 w-4 shrink-0 text-ter" />
                <input
                  ref={inputRef}
                  type={reveal ? "text" : "password"}
                  inputMode="numeric"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Enter admin password"
                  aria-label="Admin password"
                  className="caret-[#1877f2] h-[54px] w-full bg-transparent text-[16px] tracking-[0.22em] text-pri outline-none placeholder:tracking-normal placeholder:text-ter"
                />
                <button
                  type="button"
                  onClick={() => setReveal((r) => !r)}
                  aria-label={reveal ? "Hide password" : "Show password"}
                  className="rounded-full p-1.5 text-ter transition-colors hover:text-pri"
                >
                  {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="mt-3 flex min-h-[20px] items-center justify-between gap-3">
                <span className="text-[11.5px] text-ter">Admin-only · no accounts</span>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] text-sec">Remember this device</span>
                  <Toggle checked={remember} onChange={setRemember} />
                </div>
              </div>

              <div className="mt-1 min-h-[22px]">
                {error && (
                  <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#c62f34]">
                    <TriangleAlert className="h-3.5 w-3.5" /> {error}
                  </p>
                )}
              </div>

              <Pill
                type="submit"
                tone="primary"
                size="lg"
                disabled={!password || loading || success}
                className="mt-2 w-full overflow-hidden"
                icon={
                  loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : success ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )
                }
              >
                {loading ? "Verifying…" : success ? "Unlocked" : "Unlock VisaMotion"}
                <ArrowRight className="h-4 w-4 opacity-70" />
                <Shine active={!loading} />
              </Pill>
            </motion.form>

            <div className="relative mt-6 flex items-start gap-2.5 rounded-2xl border border-[rgb(var(--glass-edge))] bg-[rgb(var(--txt)/0.03)] px-3.5 py-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#16a34a]" />
              <p className="text-left text-[11.5px] leading-relaxed text-ter">
                Your session is stored on this device only. Every API call is proxied through the VisaMotion backend so keys are never
                exposed.
              </p>
            </div>
          </div>

          <p className="mt-5 text-center text-[11px] text-ter">
            VisaMotion · AI browser agent for visa, recruitment & research
          </p>
        </motion.div>
      </div>
    </div>
  );
}
