export type Provider = "browser-use" | "custom";

export type Theme = "light" | "blue";

export type RunStatus =
  | "idle"
  | "starting"
  | "ready"
  | "working"
  | "waiting"
  | "stopping"
  | "completed"
  | "failed"
  | "stopped";

export type EventKind =
  | "run.created"
  | "browser.ready"
  | "browser.reattached"
  | "step.started"
  | "page.navigated"
  | "action.clicked"
  | "action.typed"
  | "action.scrolled"
  | "agent.thinking"
  | "tool.used"
  | "file.downloaded"
  | "run.completed"
  | "run.failed"
  | "session.expired"
  | "system";

export type EventFilter = "all" | "actions" | "navigation" | "thinking" | "errors";

export interface AgentEvent {
  id: string;
  ts: number;
  kind: EventKind;
  message: string;
  detail?: string;
  step?: number;
  url?: string;
  screenshot?: string;
  level: "info" | "success" | "error";
}

/** Persisted run record, shaped to migrate to a cloud table unchanged. */
export interface TaskRecord {
  id: string;
  owner: string;
  runId: string | null;
  sessionId: string | null;
  task: string;
  startUrl: string | null;
  provider: Provider;
  status: RunStatus;
  createdAt: number;
  endedAt: number | null;
  durationMs: number | null;
  steps: number;
  output: string | null;
  structured: unknown;
  recordingUrl: string | null;
  liveViewUrl: string | null;
  error: string | null;
  parentTaskId: string | null;
  events: AgentEvent[];
}

export interface RunState {
  taskId: string | null;
  runId: string | null;
  sessionId: string | null;
  liveViewUrl: string | null;
  status: RunStatus;
  startedAt: number | null;
  finishedAt: number | null;
  step: number;
  maxSteps: number;
  task: string;
  output: string | null;
  structured: unknown;
  recordingUrl: string | null;
  error: string | null;
  errorHint: string | null;
  humanTakeover: boolean;
  provider: Provider;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
  error?: boolean;
  stopped?: boolean;
}

export interface ChatThread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export type ConnState = "unknown" | "testing" | "connected" | "invalid" | "error";

export interface CustomProviderConfig {
  enabled: boolean;
  name: string;
  baseUrl: string;
  apiKey: string;
  authHeader: string;
  authPrefix: string;
  method: "POST";
  bodyTemplate: string;
  responseMode: "json" | "sse";
  liveUrlPath: string;
  eventsUrlPath: string;
  resultPath: string;
  statusUrlPath: string;
}

export interface Settings {
  theme: Theme;
  provider: Provider;
  proxyBase: string;
  allowDirectCalls: boolean;
  browserUseKey: string;
  custom: CustomProviderConfig;
  geminiKey: string;
  geminiModel: string;
  model: string;
  maxSteps: number;
  startUrl: string;
  keepAlive: number;
  allowTakeover: boolean;
  record: boolean;
  readOnly: boolean;
}

export const DEFAULT_CUSTOM: CustomProviderConfig = {
  enabled: false,
  name: "My Agent Backend",
  baseUrl: "",
  apiKey: "",
  authHeader: "Authorization",
  authPrefix: "Bearer",
  method: "POST",
  bodyTemplate: `{
  "task": "{{task}}",
  "startUrl": "{{startUrl}}",
  "maxSteps": {{maxSteps}},
  "sessionId": "{{sessionId}}"
}`,
  responseMode: "json",
  liveUrlPath: "data.live_view_url",
  eventsUrlPath: "data.events_url",
  resultPath: "data.result",
  statusUrlPath: "data.status_url",
};

export const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  provider: "browser-use",
  proxyBase: "https://visamotion-api.visamotion365.workers.dev",
  allowDirectCalls: false,
  browserUseKey: "",
  custom: DEFAULT_CUSTOM,
  geminiKey: "",
  geminiModel: "gemini-2.5-flash",
  model: "browser-use-default",
  maxSteps: 25,
  startUrl: "",
  keepAlive: 900,
  allowTakeover: false,
  record: true,
  readOnly: true,
};

export const DEMO_TASKS = [
  "Find the cheapest Dhaka to Singapore flight next month.",
  "Search Amazon for wireless mice under $50 and summarize the top 5.",
  "Find recent visa consultancy jobs in Singapore and summarize the top 10.",
  "Research the latest AI browser-agent tools and create a comparison table.",
  "Find Bangladesh manpower recruitment agencies and summarize their services.",
];

export const CHAT_SUGGESTIONS = [
  "Write a Browser Use task to find cheap Dhaka to Singapore flights.",
  "Create a visa consultancy lead-research task.",
  "Explain why my browser agent failed.",
  "Summarize the last agent result.",
  "Write a recruitment research prompt for foreign workers.",
];

export const AGENT_MODELS = [
  { id: "browser-use-default", label: "Browser Use Default" },
  { id: "gpt-4.1", label: "GPT-4.1" },
  { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
  { id: "claude-sonnet-4", label: "Claude Sonnet 4" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
];

export const GEMINI_MODELS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
];

export const isBusy = (s: RunStatus) =>
  s === "starting" || s === "ready" || s === "working" || s === "waiting" || s === "stopping";

export const ADMIN_PASSWORD = "666085";
