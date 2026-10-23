import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Top-level boundary — keeps VisaMotion usable instead of white-screening. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[VisaMotion] render error:", error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-[#f4f6fb] p-6">
          <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-xl">
            <div className="text-[15px] font-semibold text-[#1f2937]">Something glitched on this screen</div>
            <p className="mt-1 break-words text-[12.5px] leading-relaxed text-[#6b7280]">{String(this.state.error?.message ?? this.state.error)}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full rounded-full bg-[#1877f2] px-4 py-2.5 text-[13px] font-semibold text-white"
            >
              Reload VisaMotion
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
