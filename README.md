# VisaMotion

**AI browser agent + planning chat for visa, recruitment, research and business automation.**

VisaMotion is a single-admin workspace: unlock it with one password, describe a task, and watch a
real cloud browser work in a live preview — or plan the work in a chat that can never touch a browser.

- **Design** — white-first Apple iOS Liquid Glass, with a dynamic Facebook-blue → white glass theme.
- **Agent** — Browser Use Cloud API v4 through a backend proxy, live `live_view_url` iframe, real-time event feed.
- **Chat** — Gemini only, streaming markdown, chat-only guardrail, local history.
- **Tasks** — searchable run history with results, recordings, follow-ups and replayable timelines.
- **Security** — single admin password, signed httpOnly server session, proxy-only credentials, CSP for the live view.

---

## 1. Quick start (web client)

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
```

Open the app, enter the admin password **`666085`**, optionally enable *Remember this device*, and unlock.

> The password is enforced in two places: the client lock screen (local session) and the Next.js
> middleware, which rejects every `/api/agent/*` and `/api/chat/*` request without a signed admin cookie.
> Change it with `ADMIN_PASSWORD` in production — never ship the demo password.

---

## 2. Backend proxy (required for real automation)

All sensitive calls live in the **Next.js App Router** routes under `server/`:

| Route | Method | Upstream / purpose |
| --- | --- | --- |
| `/api/auth/login` | POST | Validates `ADMIN_PASSWORD`, sets the signed `vm_admin` cookie |
| `/api/auth/logout` | POST | Clears the admin cookie |
| `/api/auth/session` | GET | Session probe |
| `/api/agent/run` | POST | `POST https://api.browser-use.com/api/v4/runs` |
| `/api/agent/runs/[runId]/events` | GET | `GET /api/v4/runs/{runId}/events` (SSE pass-through or JSON) |
| `/api/agent/runs/[runId]/stop` | POST | `POST /api/v4/runs/{runId}/stop` |
| `/api/agent/session/[sessionId]/follow-up` | POST | Reuses the existing session (`/sessions/{id}/task`, falls back to `/runs` with `sessionId`) |
| `/api/agent/ping` | GET | Browser Use connection test |
| `/api/agent/custom` | POST | Your own agent backend (JSON or SSE), key injected from `CUSTOM_AGENT_API_KEY` |
| `/api/agent/custom/test` | POST | Reachability test for the custom endpoint |
| `/api/chat` | POST | Gemini `generateContent` / `streamGenerateContent` (`?stream=1`) |

Browser Use v4 body:

```json
{ "task": "<user task>", "startUrl": "<optional>", "keepAlive": 900, "enableRecording": true }
```

Authentication header is added **server-side only**: `X-Browser-Use-API-Key: <BROWSER_USE_API_KEY>`.

### Run the driver locally

1. Create a Next.js 14/15 App Router project (or deploy `server/` as its own project).
2. Copy `server/app`, `server/lib` and `server/middleware.ts` into it.
3. `cp .env.example .env.local`, fill in the secrets, then `npm run dev`.
4. In VisaMotion **Settings → Backend proxy base URL**, enter that origin *or* serve the client from
   the same origin so `/api/...` resolves directly.

Client flow: create run → wait for `browser.ready` / `browser.reattached` → extract `live_view_url` →
render `<iframe allow="autoplay; clipboard-read; clipboard-write">` → stream events → show result,
session ID, recording and **Run follow-up task** (same session ID, same browser context).

---

## 3. Deploy to Cloudflare Workers (OpenNext)

`wrangler.toml` and `open-next.config.ts` are included and ready for the Next.js app in `server/`.

```bash
npm install -D @opennextjs/cloudflare wrangler

# Add the deployment scripts (recommended):
npm pkg set scripts.preview="opennextjs-cloudflare build && opennextjs-cloudflare preview"
npm pkg set scripts.deploy="opennextjs-cloudflare build && opennextjs-cloudflare deploy"

npm run preview     # build + local Workers preview
npm run deploy      # build + deploy to Cloudflare
```

If you prefer not to add scripts:

```bash
npx opennextjs-cloudflare build --config ./wrangler.toml
npx wrangler deploy --config ./wrangler.toml
```

### Secrets

```bash
wrangler secret put ADMIN_PASSWORD          # 666085 locally — change it in production
wrangler secret put BROWSER_USE_API_KEY
wrangler secret put GEMINI_API_KEY
wrangler secret put CUSTOM_AGENT_API_KEY
wrangler secret put CUSTOM_AGENT_BASE_URL   # optional default custom endpoint
```

For local Workers dev, copy `.dev.vars.example` to `.dev.vars` (never commit it).

### Custom domain

Uncomment the `routes` block in `wrangler.toml` and set your zone:

```toml
routes = [{ pattern = "app.visamotion.com/*", zone_name = "visamotion.com" }]
```

`compatibility_flags = ["nodejs_compat"]` keeps the edge routes compatible with the Next.js runtime,
and `[observability]` is enabled for logs. No secrets belong in `[vars]`.

---

## 4. Security model

- Keys are **never** returned to the browser, logged in full, or attached to proxied requests.
- Production keys live in encrypted Cloudflare/Next server secrets; the Settings page masks them as `****1234`.
- `live_view_url` and CDP URLs are credentials. The app never exposes a CDP URL, warns when copying the live
  view, and treats the preview URL as sensitive.
- Read-only mode appends `?readOnly=true`. Enabling human takeover removes it and shows a red live-control banner.
- Middleware requires a signed httpOnly cookie (`ADMIN_PASSWORD` secret, HMAC-SHA256) on every `/api/agent/*`
  and `/api/chat/*` request; invalid sessions get `401`.
- CSP includes `frame-src https://live.browser-use.com` and limits `connect-src` to self + provider APIs.

---

## 5. Using the workspace

### Agent
1. Unlock → **Agent**.
2. Describe the task or pick an example chip.
3. Optional: Start URL, provider, model, max steps, keep-alive, human takeover, recording.
4. **Run Agent** (Ctrl/⌘ + Enter).
5. Watch the real browser; use reload, new tab, read-only, fullscreen, copy URL, stop.
6. On completion: copy the result, open the recording, or **Run follow-up task**.

Example chips: Dhaka → Singapore flight · Amazon wireless mice · Singapore visa consultancy jobs ·
AI browser-agent comparison · Bangladesh manpower recruitment agencies.

### Chat
Separate Gemini chat, labelled **Chat only — browser automation disabled**. It writes task prompts,
explains failures, plans visa/recruitment research and summarises your last real agent result. Markdown,
copyable code blocks, regenerate, stop generation, new chat, local history, clear history.

### Tasks
Every run with status, time, duration, session ID, result preview and full event timeline. Search,
filter (All / Running / Completed / Failed), run again, continue in the same session, recording link.
Data is stored under `visamotion:tasks` with an `owner` field, ready to move to a database.

### Settings
Browser Use API · Custom Agent API · Gemini API — each with masked save/remove and a real connection test.

### Keyboard shortcuts
| Shortcut | Action |
| --- | --- |
| `Ctrl / ⌘ + K` | Focus the task input |
| `Ctrl / ⌘ + Enter` | Run the agent |
| `Esc` | Close the sidebar drawer / exit fullscreen |

---

## 6. Project map

```
index.html                 CSP, fonts, theme-color, title
src/
  App.tsx                  lock gate, sidebar shell, floating theme toggle, shortcuts
  index.css                white + blue Liquid Glass token system
  components/
    Lockscreen.tsx         VisaMotion lock screen, shake + remember device
    Sidebar.tsx            collapsible glass navigation, logout
    AgentForm.tsx          task input, options, provider selector
    LivePreview.tsx        real live_view_url iframe + controls
    ActivityFeed.tsx       filters, screenshots, auto-scroll, clear feed
    Markdown.tsx           safe markdown + code blocks with copy
    ui.tsx                 glass primitives, toggle, segmented control, sheets
  lib/
    api.ts                 Browser Use v4 + custom provider, proxy client
    gemini.ts              chat-only Gemini streaming client
    auth.ts                local + server session helpers
    store.tsx              auth, settings, runs, tasks, chats (localStorage)
    types.ts               data model (DB-ready)
server/                    Next.js App Router proxy routes + auth middleware
wrangler.toml              Cloudflare Workers config
open-next.config.ts        OpenNext adapter config
```

---

## 7. Troubleshooting

| Symptom | Cause & fix |
| --- | --- |
| “Backend proxy not reachable…” | The Next.js routes are not deployed at this origin. Deploy `server/` or set **Settings → Backend proxy base URL**. |
| “Live preview blocked by browser security policy…” | The live view refuses embedding. Open it in a new tab, and allow `frame-src https://live.browser-use.com` in CSP. |
| Test connection returns 401 | Wrong or unset `BROWSER_USE_API_KEY` / `GEMINI_API_KEY` on the server. |
| Tasks finish with no events | The proxy is not streaming; verify `/api/agent/runs/[runId]/events` returns `text/event-stream` or JSON without buffering. |
| Follow-up creates a new browser | The upstream session expired (`keepAlive`) — rerun the task and continue within the keep-alive window. |
| Lock screen rejected on a fresh deploy | Set `ADMIN_PASSWORD`; the demo default is `666085`. |
