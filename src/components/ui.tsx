import { motion, type HTMLMotionProps } from "framer-motion";
import React from "react";
import { cn } from "@/utils/cn";

/* ---------------- Glass ---------------- */

export function Glass({
  className,
  children,
  strong,
  sheen = true,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { strong?: boolean; sheen?: boolean }) {
  return (
    <div
      className={cn("glass glass-spec rounded-[26px]", strong && "glass-strong", sheen && "glass-sheen", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ---------------- Buttons ---------------- */

type PillProps = HTMLMotionProps<"button"> & {
  tone?: "primary" | "glass" | "danger" | "ghost" | "success";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  active?: boolean;
};

export function Pill({ tone = "glass", size = "md", icon, children, className, active, ...rest }: PillProps) {
  const sizes = {
    sm: "h-8 px-3 text-[12.5px] gap-1.5 rounded-full",
    md: "h-10 px-4 text-[13.5px] gap-2 rounded-full",
    lg: "h-[52px] px-6 text-[15px] gap-2.5 rounded-full",
  }[size];

  const tones: Record<string, string> = {
    primary:
      "text-white bg-[linear-gradient(180deg,#3b8ef8_0%,#1877f2_55%,#0f63cf_100%)] shadow-[0_12px_26px_-12px_rgba(24,119,242,0.85),inset_0_1px_0_rgba(255,255,255,0.45)] hover:brightness-[1.06]",
    success:
      "text-white bg-[linear-gradient(180deg,#34c98a_0%,#16a34a_60%,#0f7a36_100%)] shadow-[0_10px_24px_-12px_rgba(22,163,74,0.7),inset_0_1px_0_rgba(255,255,255,0.4)]",
    danger:
      "text-white bg-[linear-gradient(180deg,#ff7a7e_0%,#e5484d_60%,#c62f34_100%)] shadow-[0_10px_24px_-12px_rgba(229,72,77,0.75),inset_0_1px_0_rgba(255,255,255,0.35)]",
    glass:
      "glass glass-spec text-pri hover:bg-[rgb(var(--glass-bg-strong))]",
    ghost: "text-sec hover:text-pri hover:bg-[rgb(var(--txt)/0.05)]",
  };

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 520, damping: 30 }}
      className={cn(
        "pill-press ring-focus relative inline-flex select-none items-center justify-center font-medium tracking-[-0.01em] disabled:pointer-events-none disabled:opacity-40",
        sizes,
        tones[tone],
        active && tone === "glass" && "bg-[rgb(24_119_242/0.12)] text-[#1877f2]",
        className,
      )}
      {...rest}
    >
      {icon}
      {children as React.ReactNode}
    </motion.button>
  );
}

export function IconBtn({
  label,
  children,
  className,
  active,
  ...rest
}: HTMLMotionProps<"button"> & { label: string; active?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      whileHover={{ y: -1 }}
      transition={{ type: "spring", stiffness: 520, damping: 28 }}
      title={label}
      aria-label={label}
      className={cn(
        "ring-focus grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[rgb(var(--glass-edge))] bg-[rgb(var(--glass-bg))] text-sec backdrop-blur-xl transition-colors hover:text-pri disabled:pointer-events-none disabled:opacity-35",
        active && "border-[rgb(24_119_242/0.35)] bg-[rgb(24_119_242/0.14)] text-[#1877f2]",
        className,
      )}
      {...rest}
    >
      {children as React.ReactNode}
    </motion.button>
  );
}

/* ---------------- Toggle ---------------- */

export function Toggle({
  checked,
  onChange,
  tone = "blue",
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  tone?: "blue" | "green" | "red";
  disabled?: boolean;
}) {
  const on = {
    blue: "bg-[linear-gradient(180deg,#4a98fb,#1877f2)]",
    green: "bg-[linear-gradient(180deg,#34c98a,#16a34a)]",
    red: "bg-[linear-gradient(180deg,#ff7a7e,#e5484d)]",
  }[tone];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "ring-focus relative h-[30px] w-[51px] shrink-0 rounded-full transition-colors duration-300 disabled:opacity-40",
        checked ? on : "bg-[rgb(var(--txt)/0.14)]",
        "shadow-[inset_0_1px_3px_rgba(15,30,60,0.18)]",
      )}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 700, damping: 36 }}
        className="absolute top-[2px] h-[26px] w-[26px] rounded-full bg-white shadow-[0_2px_6px_rgba(15,30,60,0.3)]"
        style={{ left: checked ? 23 : 2 }}
      />
    </button>
  );
}

/* ---------------- Segmented ---------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = "md",
}: {
  options: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const id = React.useId();
  return (
    <div
      className={cn(
        "relative inline-flex rounded-full border border-[rgb(var(--glass-edge))] bg-[rgb(var(--txt)/0.05)] p-[3px] backdrop-blur-xl",
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "ring-focus relative z-10 whitespace-nowrap rounded-full font-medium transition-colors",
              size === "sm" ? "px-3 py-[5px] text-[12px]" : "px-4 py-[7px] text-[13px]",
              active ? "text-pri" : "text-sec hover:text-pri",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={{ type: "spring", stiffness: 480, damping: 36 }}
                className="absolute inset-0 -z-10 rounded-full border border-[rgb(var(--glass-border))] bg-[rgb(var(--glass-bg-strong))] shadow-[0_4px_12px_-6px_rgba(19,42,82,0.4)]"
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Fields ---------------- */

export function Field({
  label,
  hint,
  children,
  className,
  right,
}: {
  label?: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  right?: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      {(label || right) && (
        <div className="mb-1.5 flex items-center justify-between gap-3">
          {label && <span className="text-[11.5px] font-semibold tracking-[0.08em] text-sec uppercase">{label}</span>}
          {right}
        </div>
      )}
      {children}
      {hint && <p className="mt-1.5 text-[11.5px] leading-relaxed text-ter">{hint}</p>}
    </label>
  );
}

export const inputCls =
  "caret-[#1877f2] ring-focus w-full rounded-2xl border border-[rgb(var(--glass-edge))] field-bg px-4 py-3 text-[14px] text-pri placeholder:text-ter backdrop-blur-xl transition-shadow";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputCls, "resize-none font-mono text-[12.5px] leading-relaxed", props.className)} />;
}

export function Select({
  value,
  onChange,
  options,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputCls, "appearance-none py-2.5 pr-9 text-[13px] [&>option]:bg-white [&>option]:text-[#0b1220]")}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ter"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      >
        <path d="M3 4.5 6 7.5 9 4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* ---------------- Misc ---------------- */

export function Dot({ tone = "green", pulse }: { tone?: "green" | "blue" | "orange" | "red" | "grey"; pulse?: boolean }) {
  const c = {
    green: "bg-[#16a34a] shadow-[0_0_8px_1px_rgba(22,163,74,0.45)]",
    blue: "bg-[#1877f2] shadow-[0_0_8px_1px_rgba(24,119,242,0.45)]",
    orange: "bg-[#f59e0b] shadow-[0_0_8px_1px_rgba(245,158,11,0.4)]",
    red: "bg-[#e5484d] shadow-[0_0_8px_1px_rgba(229,72,77,0.4)]",
    grey: "bg-[rgb(var(--txt)/0.3)]",
  }[tone];
  return (
    <span className="relative inline-flex h-2 w-2 shrink-0">
      {pulse && <span className={cn("absolute inset-0 animate-ping rounded-full opacity-60", c)} />}
      <span className={cn("relative h-2 w-2 rounded-full", c)} />
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-xl", className)} />;
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "blue" | "green" | "red" | "orange";
  className?: string;
}) {
  const tones = {
    neutral: "bg-[rgb(var(--txt)/0.06)] text-sec border-[rgb(var(--glass-edge))]",
    blue: "bg-[rgb(24_119_242/0.1)] text-[#0f63cf] border-[rgb(24_119_242/0.24)]",
    green: "bg-[rgb(22_163_74/0.1)] text-[#0f7a36] border-[rgb(22_163_74/0.24)]",
    red: "bg-[rgb(229_72_77/0.1)] text-[#c62f34] border-[rgb(229_72_77/0.24)]",
    orange: "bg-[rgb(245_158_11/0.12)] text-[#a16207] border-[rgb(245_158_11/0.28)]",
  }[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11.5px] font-medium tracking-[-0.005em]", tones, className)}>
      {children}
    </span>
  );
}

export function Shine({ active = true }: { active?: boolean }) {
  if (!active) return null;
  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
      <span className="shine-sweep absolute -inset-y-6 left-0 w-14 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.5),transparent)]" />
    </span>
  );
}

/* ---------------- Empty / error ---------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact,
}: {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "p-6" : "p-10")}>
      <motion.div
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        className={cn(
          "mb-4 grid place-items-center rounded-[20px] border border-[rgb(var(--glass-edge))] bg-[rgb(var(--glass-bg-strong))] text-[#1877f2] shadow-[0_10px_26px_-16px_rgba(24,119,242,0.6)]",
          compact ? "h-12 w-12" : "h-16 w-16",
        )}
      >
        {icon}
      </motion.div>
      <h3 className={cn("font-semibold tracking-[-0.02em] text-pri", compact ? "text-[14px]" : "text-[17px]")}>{title}</h3>
      <p className={cn("mx-auto mt-1.5 max-w-sm leading-relaxed text-ter", compact ? "text-[12px]" : "text-[13px]")}>{description}</p>
      {action && <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  retryLabel = "Retry",
  secondary,
  compact,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  secondary?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("rounded-[20px] border border-[rgb(229_72_77/0.28)] bg-[rgb(229_72_77/0.07)]", compact ? "p-3.5" : "p-5")}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[rgb(229_72_77/0.14)]">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#c62f34]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 8v5M12 16.5v.5" />
            <path d="M10.3 3.9 1.8 18.4A2 2 0 0 0 3.5 21.4h17A2 2 0 0 0 22.2 18.4L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-pri">{title}</p>
          <p className="mt-1 break-words text-[12.5px] leading-relaxed text-[#a33136]">{message}</p>
          {(onRetry || secondary) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {onRetry && (
                <Pill tone="glass" size="sm" onClick={onRetry}>
                  {retryLabel}
                </Pill>
              )}
              {secondary}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Bottom sheet ---------------- */

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[#0b1220]/35 backdrop-blur-sm"
        />
      )}
      {open && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 38 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.4 }}
          onDragEnd={(_, info) => info.offset.y > 110 && onClose()}
          className="glass glass-spec glass-strong safe-bottom fixed inset-x-0 bottom-0 z-50 flex max-h-[84vh] flex-col rounded-t-[28px]"
        >
          <div className="flex shrink-0 justify-center pt-2.5">
            <span className="h-1.5 w-10 rounded-full bg-[rgb(var(--txt)/0.22)]" />
          </div>
          <div className="flex shrink-0 items-center justify-between px-4 py-3">
            <div className="text-[14px] font-semibold text-pri">{title}</div>
            <button onClick={onClose} className="rounded-full px-3 py-1 text-[13px] font-medium text-[#1877f2]">
              Done
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </motion.div>
      )}
    </>
  );
}

export function useCopy() {
  const [copied, setCopied] = React.useState(false);
  const copy = React.useCallback((text: string) => {
    const done = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(done);
    else {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* noop */
      }
      ta.remove();
      done();
    }
  }, []);
  return { copied, copy };
}
