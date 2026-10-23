import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, MonitorPlay, Smartphone, Tablet, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { decorateLiveUrl } from "@/lib/api";
import { hostOf } from "@/lib/format";
import { useApp } from "@/lib/store";

type DeviceKind = "phone" | "ipad" | "win";
type Device = { kind: DeviceKind; label: string; w: number; h: number; cls: string; bar: React.ReactNode };

/** Bottom-docked live preview — real device sizing per screen, smooth in/out. */
export default function PreviewDock() {
  const { run, settings, previewDock, togglePreviewDock } = useApp();
  const live = run.liveViewUrl;
  const [device, setDevice] = useState<DeviceKind>("phone");

  useEffect(() => {
    const w = window.innerWidth;
    setDevice(w >= 1280 ? "win" : w >= 768 ? "ipad" : "phone");
  }, []);

  const src = useMemo(() => (live ? decorateLiveUrl(live, settings.readOnly && !settings.allowTakeover) : null), [live, settings.readOnly, settings.allowTakeover]);

  const devices: Record<DeviceKind, Device> = {
    phone: {
      kind: "phone", label: "Phone", w: 330, h: 520,
      cls: "rounded-[34px] border-[10px] border-neutral-900 shadow-[0_24px_60px_rgba(0,0,0,0.35)] bg-neutral-900 overflow-hidden",
      bar: (
        <div className="flex h-6 items-center justify-center bg-neutral-900">
          <div className="h-[7px] w-16 rounded-full bg-neutral-700" />
        </div>
      ),
    },
    ipad: {
      kind: "ipad", label: "iPad", w: 520, h: 460,
      cls: "rounded-[22px] border-[14px] border-neutral-800 shadow-[0_24px_60px_rgba(0,0,0,0.35)] bg-neutral-800 overflow-hidden",
      bar: (
        <div className="flex h-5 items-center justify-center bg-neutral-100 border-b border-black/5 text-[9px] font-semibold text-neutral-400">
          {live ? hostOf(live) : "live session"}
        </div>
      ),
    },
    win: {
      kind: "win", label: "Windows", w: 640, h: 440,
      cls: "rounded-md overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.35)] ring-1 ring-black/15 bg-[#f3f3f3]",
      bar: (
        <div className="flex h-8 items-center gap-2 bg-[#f3f3f3] border-b border-black/10 px-3">
          <MonitorPlay className="h-3.5 w-3.5 text-neutral-500" />
          <span className="truncate text-[11px] text-neutral-600">{live ? hostOf(live) : "live session"}</span>
          <span className="ml-auto flex items-center gap-1 text-neutral-500">
            <span className="grid h-4 w-6 place-items-center text-[10px] hover:bg-black/5">─</span>
            <span className="grid h-4 w-6 place-items-center text-[10px] hover:bg-black/5">▢</span>
            <span className="grid h-4 w-6 place-items-center text-[11px] hover:bg-[#e81123] hover:text-white">✕</span>
          </span>
        </div>
      ),
    },
  };

  const d = devices[device];
  const scale = 1;
  const fullScreen = device === "phone";

  return (
    <AnimatePresence>
      {previewDock && (
        <motion.div
          initial={fullScreen ? { opacity: 0, y: "100%" } : { y: 40, opacity: 0, scale: 0.96 }}
          animate={fullScreen ? { opacity: 1, y: 0 } : { y: 0, opacity: 1, scale }}
          exit={fullScreen ? { opacity: 0, y: "100%" } : { y: 40, opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className={fullScreen ? "safe-top safe-bottom fixed inset-0 z-[70] flex flex-col bg-black" : "fixed bottom-3 left-1/2 z-50 -translate-x-1/2"}
          style={fullScreen ? undefined : { width: Math.min(d.w, window.innerWidth - 24) }}
        >
          {fullScreen ? (
            <>
              <div className="flex h-11 shrink-0 items-center gap-2 bg-black px-3 text-white">
                <MonitorPlay className="h-4 w-4 text-white/70" />
                <span className="truncate text-[12.5px] font-medium">{live ? hostOf(live) : "live session"}</span>
                {src && (
                  <button
                    onClick={() => window.open(src, "_blank", "noopener,noreferrer")}
                    className="ml-auto grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20"
                    title="Open live view in a new tab"
                  >
                    <ExternalLink className="h-4 w-4 text-white/90" />
                  </button>
                )}
                <button onClick={togglePreviewDock} className="grid h-8 w-8 place-items-center rounded-full bg-white/10 hover:bg-white/20" title="Close preview">
                  <X className="h-4 w-4 text-white/90" />
                </button>
              </div>
              <div className="relative min-h-0 flex-1 bg-white">
                {src ? (
                  <iframe src={src} title="Agent live preview" allow="autoplay; clipboard-read; clipboard-write" className="absolute inset-0 h-full w-full border-0 bg-white" />
                ) : (
                  <div className="absolute inset-0 grid place-items-center bg-[#f7f8fa] p-6 text-center">
                    <div>
                      <MonitorPlay className="mx-auto h-8 w-8 text-neutral-300" />
                      <div className="mt-2 text-[13px] font-medium text-neutral-500">
                        {run.status === "starting" || run.status === "ready" || run.status === "working"
                          ? "Connecting to the cloud browser…"
                          : "Run the agent — the live view appears here"}
                      </div>
                      <div className="mt-1 text-[11px] text-neutral-400">browser.ready attaches the live session automatically</div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
          <>
          <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-1 rounded-full bg-black/75 px-2 py-1 backdrop-blur">
              {(["phone", "ipad", "win"] as DeviceKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setDevice(k)}
                  className={`grid h-6 w-6 place-items-center rounded-full ${device === k ? "bg-white/20" : "hover:bg-white/10"}`}
                  title={devices[k].label}
                >
                  {k === "phone" ? <Smartphone className="h-3 w-3 text-white/90" /> : k === "ipad" ? <Tablet className="h-3 w-3 text-white/90" /> : <MonitorPlay className="h-3 w-3 text-white/90" />}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              {src && (
                <button
                  onClick={() => window.open(src, "_blank", "noopener,noreferrer")}
                  className="grid h-6 w-6 place-items-center rounded-full bg-black/75 hover:bg-black/90"
                  title="Open live view in a new tab"
                >
                  <ExternalLink className="h-3 w-3 text-white/90" />
                </button>
              )}
              <button onClick={togglePreviewDock} className="grid h-6 w-6 place-items-center rounded-full bg-black/75 hover:bg-black/90" title="Close preview">
                <X className="h-3.5 w-3.5 text-white/90" />
              </button>
            </div>
          </div>

          <div className={d.cls} style={{ height: Math.min(d.h, window.innerHeight - 140) }}>
            {d.bar}
            <div className="relative h-[calc(100%-24px)] w-full bg-white">
              {src ? (
                <iframe src={src} title="Agent live preview" allow="autoplay; clipboard-read; clipboard-write" className="absolute inset-0 h-full w-full border-0 bg-white" />
              ) : (
                <div className="absolute inset-0 grid place-items-center bg-[#f7f8fa] p-4 text-center">
                  <div>
                    <MonitorPlay className="mx-auto h-6 w-6 text-neutral-300" />
                    <div className="mt-2 text-[12px] font-medium text-neutral-500">
                      {run.status === "starting" || run.status === "ready" || run.status === "working"
                        ? "Connecting to the cloud browser…"
                        : "Run the agent — the live view appears here"}
                    </div>
                    <div className="mt-1 text-[10.5px] text-neutral-400">browser.ready attaches the live session automatically</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
