import type { EventFilter, EventKind, RunStatus } from "./types";

export function statusMeta(status: RunStatus): {
  label: string;
  dot: "green" | "blue" | "orange" | "red" | "grey";
  tone: "neutral" | "blue" | "green" | "red" | "orange";
} {
  switch (status) {
    case "starting":
      return { label: "Starting", dot: "orange", tone: "orange" };
    case "ready":
      return { label: "Browser ready", dot: "green", tone: "green" };
    case "working":
      return { label: "Working", dot: "blue", tone: "blue" };
    case "waiting":
      return { label: "Waiting", dot: "orange", tone: "orange" };
    case "stopping":
      return { label: "Stopping", dot: "orange", tone: "orange" };
    case "completed":
      return { label: "Completed", dot: "green", tone: "green" };
    case "failed":
      return { label: "Failed", dot: "red", tone: "red" };
    case "stopped":
      return { label: "Stopped", dot: "grey", tone: "neutral" };
    default:
      return { label: "Idle", dot: "grey", tone: "neutral" };
  }
}

export const EVENT_STYLE: Record<EventKind, { color: string; ring: string; label: string }> = {
  "run.created": { color: "#8e8e93", ring: "rgba(142,142,147,0.14)", label: "Run" },
  "browser.ready": { color: "#16a34a", ring: "rgba(22,163,74,0.14)", label: "Browser" },
  "browser.reattached": { color: "#16a34a", ring: "rgba(22,163,74,0.14)", label: "Reattached" },
  "step.started": { color: "#1877f2", ring: "rgba(24,119,242,0.14)", label: "Step" },
  "page.navigated": { color: "#0891b2", ring: "rgba(8,145,178,0.14)", label: "Navigate" },
  "action.clicked": { color: "#7c3aed", ring: "rgba(124,58,237,0.14)", label: "Click" },
  "action.typed": { color: "#7c3aed", ring: "rgba(124,58,237,0.14)", label: "Type" },
  "action.scrolled": { color: "#7c3aed", ring: "rgba(124,58,237,0.14)", label: "Scroll" },
  "agent.thinking": { color: "#4f46e5", ring: "rgba(79,70,229,0.14)", label: "Thinking" },
  "tool.used": { color: "#d97706", ring: "rgba(217,119,6,0.14)", label: "Tool" },
  "file.downloaded": { color: "#16a34a", ring: "rgba(22,163,74,0.14)", label: "Download" },
  "run.completed": { color: "#16a34a", ring: "rgba(22,163,74,0.16)", label: "Done" },
  "run.failed": { color: "#e5484d", ring: "rgba(229,72,77,0.14)", label: "Error" },
  "session.expired": { color: "#e5484d", ring: "rgba(229,72,77,0.14)", label: "Expired" },
  system: { color: "#8e8e93", ring: "rgba(142,142,147,0.14)", label: "System" },
};

export const FILTERS: { value: EventFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "actions", label: "Actions" },
  { value: "navigation", label: "Navigation" },
  { value: "thinking", label: "Thinking" },
  { value: "errors", label: "Errors" },
];

export function matchesFilter(kind: EventKind, f: EventFilter): boolean {
  switch (f) {
    case "actions":
      return kind.startsWith("action.") || kind === "tool.used" || kind === "file.downloaded";
    case "navigation":
      return kind === "page.navigated" || kind === "browser.ready" || kind === "browser.reattached";
    case "thinking":
      return kind === "agent.thinking" || kind === "step.started";
    case "errors":
      return kind === "run.failed" || kind === "session.expired";
    default:
      return true;
  }
}

export function clock(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

export function relTime(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function fullTime(ts: number) {
  return new Date(ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function duration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function hostOf(url: string | null) {
  if (!url) return "";
  try {
    return new URL(url).host;
  } catch {
    return url.split("/")[0];
  }
}
