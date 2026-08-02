# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Always use ponytail skill

## Project overview

JobMatch: AI-powered resume analyzer and job application tracker (Next.js 16 App Router). Paste a job description → get an AI match score, missing keywords, and improvement suggestions against an uploaded resume; track applications through a pipeline; edit resume LaTeX with an AI chat assistant. A companion Chrome extension (`extension/`) surfaces match scores directly on LinkedIn job pages.

## Commands

```bash
pnpm dev          # dev server (Turbopack)
pnpm build        # production build (runs scripts/download-busytex.mjs first)
pnpm check        # biome lint + format check
pnpm fix          # auto-fix biome issues
npx tsc --noEmit  # TypeScript type check (no build script for this)

pnpm test              # run the full vitest suite once
pnpm test:watch        # vitest watch mode
npx vitest run path/to/file.test.ts   # run a single test file
npx vitest run -t "test name"         # run tests matching a name

npx drizzle-kit push    # apply schema changes to the database
npx drizzle-kit studio  # open database GUI
npx drizzle-kit generate  # generate migration files
```

The linter is **Biome** (configured in `biome.jsonc`, extends `ultracite`). `pnpm fix` handles most auto-fixable issues; run `pnpm check` to verify. A husky pre-commit hook runs `pnpm check` automatically — fix violations before committing.

Notable enforced rules: `noNestedTernary` (use if-else for 3-way conditionals), `useBlockStatements` (braces required on if bodies), `useTopLevelRegex` (declare regex at module scope). The `extension/` JS files have pre-existing `noUndeclaredVariables` warnings for `chrome.*` globals — ignore them.

**Tests** (`vitest.config.mts`) run in a plain Node environment (no jsdom) — they exercise exported pure functions and server-side logic directly (LaTeX diff/patching in `use-ai-chat.ts`, SSRF-guard URL validation in `fetch-job/route.ts`, rate limiting, model resolution, etc.), not component rendering. `server-only` is aliased to a no-op stub (`vitest.server-only-stub.ts`) so server modules can be imported directly in tests; `vitest.setup.ts` loads `.env` so provider SDK constructors in `lib/models.ts` see real keys.

**Schema type changes**: `drizzle-kit push` cannot automatically cast column types (e.g. `text → jsonb`). When this happens, run the cast manually:
```bash
node -e "
const { neon } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env' });
const sql = neon(process.env.DATABASE_URL);
sql\`ALTER TABLE t ALTER COLUMN c TYPE jsonb USING c::jsonb\`
  .then(() => process.exit(0)).catch(e => { console.error(e.message); process.exit(1); });
"
```
`drizzle-kit push` also runs an interactive prompt whenever it can't tell if a table/column is new vs. renamed (e.g. after adding a table alongside dropping another) — it needs a real TTY, so run it directly in a terminal rather than through a non-interactive wrapper.

## Architecture

### Auth & middleware

- **`proxy.ts`** exports `proxy` (the middleware function) and `config` (the matcher). Next.js picks this up as `middleware.ts` via a config alias — do not rename it to `middleware.ts`.
- Auth is **better-auth** (`lib/auth.ts` server, `lib/auth-client.ts` client). Session cookie: `better-auth.session_token`.
- The middleware's `PROTECTED` list covers `/jobs`, `/settings`, `/editor`. All three are also inside `app/(protected)/` — the layout calls `requireSession()` as a double guard.
- Server-side auth: `app/(protected)/layout.tsx` calls `requireSession()` from `server/session.ts`. Individual protected pages do **not** need their own auth guard.

### Server actions (`server/`)

Actions are split by domain. All import the shared React-cached `getSession` from `server/session.ts` — this deduplicates session lookups within a single render pass.

| File | Exports |
|---|---|
| `server/users.ts` | `getCurrentUser`, `signIn`, `signUp` |
| `server/jobs.ts` | `createJob`, `getJobs`, `updateJobStatus`, `deleteJob`, `getJobById` |
| `server/resume.ts` | `uploadResume`, `getPersonalInformation`, `saveAiPreferences`, `savePreferredModelId` — user-level profile fields only (resume URL, AI preferences, model choice) |
| `server/resume-editor.ts` | `getResumeDocument`, `saveLatex`, `appendTurn`, `restoreRevision`, `clearMessages`, `answerQuestion` — the versioned resume-document/chat read-write API; see below |
| `server/analysis.ts` | `saveAnalysis`, `getAnalysisByJobId` |
| `server/session.ts` | `getSession`, `requireSession` (internal, not called from client) |

### Database (`db/`)

Drizzle ORM on Neon (serverless PostgreSQL). Schema in `db/schema.ts`; use `db.query.*` for relational queries and `db.insert/update/delete` for mutations.

Key tables:
- `personalInformation` — one row per user; user-level profile only: `resumeUrl`, `aiPreferences`, `preferredModelId`. Does **not** store resume text or chat history (see `resumeDocuments` below).
- `resumeDocuments` — the resume text itself, server-authoritative and version-checked. `jobId: null` = the user's global resume; `jobId: N` = a per-job variant. One table for both cases via **partial unique indexes** (`resumeDocuments_global_unique` on `userId` where `jobId IS NULL`, `resumeDocuments_job_unique` on `(userId, jobId)` where `jobId IS NOT NULL`) rather than a discriminator column. Every write is optimistic-concurrency checked against `version` (see below).
- `resumeRevisions` — one row per AI-applied edit or restore (never per keystroke — manual typing autosaves straight to `resumeDocuments.resumeLatex` with no revision row). Lets the editor's "restore to here" button jump back to any past AI checkpoint.
- `resumeMessages` — the chat log, append-only rows (not a JSONB blob) with a typed `role` (`user`/`assistant`/`notice`/`question`), FK'd to `resumeDocuments` and optionally to the `resumeRevisions` row an assistant/notice message produced. `questionAnswered` is the one field ever updated in place (marking a consultation question as answered).
- `analysis` — stores `matchPercentage`, `summary`, `additionalInsights`, and `strengths`/`missingKeywords`/`improvementSuggestions` as **JSONB** (`string[]`). No manual `JSON.stringify`/`JSON.parse` needed — Drizzle handles it via `.$type<string[]>()`. Has a unique index on `(jobId, userId)`; `saveAnalysis` upserts via `onConflictDoUpdate`.

**Critical**: the `schema` export in `db/schema.ts` must include both table objects **and** relation objects (`userRelations`, `jobsRelations`, etc.). Without the relation objects, `db.query.*` with `with:` clauses types the result as `never[]`.

**Optimistic concurrency**: every write to a `resumeDocuments` row (`saveLatex`, `appendTurn`'s optional `latexUpdate`, `restoreRevision`) is a conditional `UPDATE ... WHERE id = ? AND version = ?`. Zero rows returned means someone else saved first — the server returns `{ success: false, conflict: true }` rather than silently overwriting; the client (`lib/queries/resume.ts`) surfaces this as a blocking toast, never a silent merge. `appendTurn` is the single call per chat turn (a user message, an AI response, or a consultation question/notice) — it optionally bumps the document version + inserts a revision, then inserts every message in the same transaction, so the message log is always append-only and never a bulk overwrite of prior history. `resumeDocuments` rows are created lazily on first write (`findOrCreateDocument` in `server/resume-editor.ts`) — a pristine editor has no row yet, and a fresh row's default `version: 0` matches the version an empty-state client expects, so the same conflict check works for both "brand new" and "existing" documents.

### TanStack Query

**`app/get-query-client.ts`** — singleton factory. Uses React's `cache()` so all server components in a single request share one `QueryClient`; the browser gets a module-level singleton.

**`lib/queries/`** — hooks split by domain:
- `jobs.ts`: `useJobs()`, `useCreateJob()`, `useDeleteJob()`, `useUpdateJobStatus()`, `useReanalyzeJob()` — delete and status mutations do optimistic updates with rollback.
- `resume.ts`: `usePersonalInfo()`, `useResumeDocument(jobId)`, `useSaveLatex(jobId)`, `useAppendTurn(jobId)`, `useRestoreRevision(jobId)`, `useAnswerQuestion(jobId)`, `useClearMessages(jobId)`, `useSaveAiPreferences()`, `useSavePreferredModelId()` — the write hooks read `expectedVersion` straight off whatever's currently cached (never threaded through by the caller), and take an optional `{ onConflict }` callback so a component (e.g. the editor header's out-of-sync badge) can react beyond the default toast.
- `analyze.ts`: `useFetchJobDescription()`, `useAnalyzeMatch()`.

**Page pattern** for protected routes:
1. Server component calls `getQueryClient()`, fires `prefetchQuery` (no `await` — streaming), wraps children in `<HydrationBoundary state={dehydrate(queryClient)}>`.
2. Client components call `useSuspenseQuery` via the hooks above — data is immediately available from the hydrated cache; a `<Suspense>` boundary shows a skeleton during streaming.
3. Write operations use `useMutation` hooks.

**Editor pattern**: `app/(protected)/editor/page.tsx` `await`s all its data (personal info, job, global + job-specific `resumeDocuments`) before rendering — unlike the jobs/analyze pages, this blocks, so it has its own `loading.tsx` (reusing the `EditorSkeleton` component from `components/latex-editor/editor-skeleton.tsx`) rather than relying on an in-page Suspense fallback. It seeds the query cache via `queryClient.setQueryData` (data already in hand), then wraps in `HydrationBoundary`.

`staleTime` is 5 minutes globally, **except** `useResumeDocument`, which sets `staleTime: 0` + `refetchOnWindowFocus: true` — it's the query that has to actually notice "edited in another tab" so the next save's conflict check has a fresh baseline, not a 5-minute-stale one.

### API routes (`app/api/`)

| Route | Purpose |
|---|---|
| `auth/[...all]` | better-auth catch-all handler |
| `edit-latex` | Streaming LaTeX edits — uses `streamText` with a client-side `editResume` tool + `toUIMessageStreamResponse()` |
| `job-customize` | Consultation questions for tailoring resume to a job |
| `analyze` | AI resume-vs-job match scoring; returns cached analysis if `jobId` provided |
| `fetch-job` | Scrapes job description from a URL (SSRF-guarded — see `isSafeUrl` in `fetch-job/route.test.ts`) |
| `upload-resume` | Handles PDF upload to R2, triggers background LaTeX generation |
| `jobs` | POST — creates a job; accepts optional `analysis` payload to save analysis + an empty `resumeDocuments` placeholder row in one transaction |

All routes validate the session via `auth.api.getSession({ headers: req.headers })` and parse the request body with Zod before any AI calls.

Rate limiting (`lib/rate-limit.ts`) — per-instance sliding window — is applied in `analyze` (10/min), `edit-latex` (30/min), and `job-customize` (30/min).

### AI models (`lib/models.ts`)

- `resolveModel(id: string)` — use in API routes; falls back to `DEFAULT_MODEL_ID` if `id` is invalid, and logs the resolved model id (and any fallback) to the console for every call — useful for confirming which model an API route actually used.
- Providers: Google, OpenAI, Mistral, and OpenRouter (`@openrouter/ai-sdk-provider`, reads `OPENROUTER_API_KEY`) — add new models to the `models` array with the matching `provider`.
- Default model: `nemotron-3-ultra-550b` (`DEFAULT_MODEL_ID`). Model selection is a server-side user preference (`personalInformation.preferredModelId`, via `savePreferredModelId`/`useSavePreferredModelId`), not `localStorage` — `useModelId()` (`lib/use-model-id.ts`) is a thin wrapper around `usePersonalInfo()` + `useSavePreferredModelId()`, so it needs to run somewhere already covered by a `personal-info` prefetch + Suspense boundary (every page that uses it already is).
- `lib/dev-log.ts` — `logApiError` (logs `err.message` only; raw AI SDK errors carry the full request/response body — e.g. base64 PDFs — as enumerable properties, so `console.error(err)` directly floods the console) and `logVendorTiming` (logs elapsed ms since a `performance.now()` start). Used across the AI API routes for consistent, non-huge logs.

### LaTeX editor (`/editor`)

URL: `/editor` (global resume) or `/editor?jobId=N` (job-specific).

`isNewJobResume` triggers the AI consultation flow. It is `true` only when: a job is selected **AND** its `resumeDocuments` row has no `resumeLatex` **AND** no messages exist for it. Saving a job from the Chrome extension (which stores analysis + creates an empty `resumeDocuments` placeholder in a single transaction) means `isNewJobResume` is always `false` on subsequent editor opens.

A job-scoped editor with no `resumeDocuments` row of its own falls back to the global resume's text as its starting point (`useLatexEditor` fetches both `useResumeDocument(jobId)` and `useResumeDocument(null)` — the latter call is free when `jobId` is already `null`, since it's the same query key). Chat messages are never shared this way — `resumeMessages` are always scoped strictly to one `resumeDocuments` row, so a job-specific editor's chat history never includes the global resume's conversation.

The editor compiles via `@nandan-varma/platex/client` (`use-engine.ts`) — no `serviceUrl` is configured, so it always uses platex's bundled WASM TeX Live backend (`texlyre-busytex` under the hood, dynamically imported and cached by the library itself; `use-engine.ts` no longer manages engine lifecycle directly). `busytex.wasm`, `busytex.js`, and `texlive-extra.data` are all redirected in `next.config.ts` to `wasm.basePath: '/core/busytex'`. Each compile injects a `\typeout{JOBMATCH_FILL:...}` probe right before `\end{document}` to read `\pagetotal`/`\textheight` off the compile log — this gives `fillRatio` (how full the last page is), passed alongside `pageCount` to the AI so it can distinguish "one page but nearly empty, could add more" from "one page and well-used" rather than just a page count. `pageCount`/`fillRatio` are parsed from `result.logs[...].log` (per-pass raw logs), not a single flattened string.

**Streaming edits**: `edit-latex` uses `streamText` (not `streamObject`) with a client-side `editResume` tool (no `execute` — the model calls it, the client applies the edits) instead of a rigid `{explanation, edits}` object schema. This matters: plain conversational text streams as real token deltas and can be any length, whereas structured/tool-call JSON output is frequently *not* streamed incrementally by providers (often arrives as one buffered blob), and a schema description like "1-2 sentences" caps informational answers even when the user asked a question rather than requesting an edit. The model is instructed to just answer in text for questions/plans, and only call `editResume` when the user wants an actual document change.

The client (`use-ai-chat.ts`) consumes the response with the AI SDK's UI Message Stream primitives — `parseJsonEventStream` (schema: `uiMessageChunkSchema`) piped into `readUIMessageStream` — not `useChat`, since the app's chat state (persisted history via `appendTurn`, "notice"/"question" message roles for the consultation flow) is custom. It renders each yielded message's accumulating `text` parts for live streaming and reads the `tool-editResume` part's `input.edits` once available, applying them via `applyEdits` (a multi-pass fuzzy find-and-replace: exact match → trimmed-line match → blank-line-collapsed match; unit-tested in `use-ai-chat.test.ts`). The live-streaming assistant bubble is local-only ephemeral state (`streamingMessage` in `use-latex-editor.ts`) until the stream finishes, at which point it's persisted via `appendTurn` and the ephemeral state is cleared — persisted chat history always comes from the `resumeDocuments` query, never from client-only state.

**Restore**: every AI-applied edit and every restore itself creates a new `resumeRevisions` row (restoring is non-destructive — it never deletes messages or earlier revisions, so "restore from a restore" keeps working). The chat UI's restore button (`chat-bubbles.tsx` / `editor-pane.tsx`) calls `useRestoreRevision(jobId)`.

**Fast local undo vs. durable restore**: `use-ai-chat.ts` keeps a small in-memory undo/redo stack (`Mod-z`/`Mod-y`, lost on reload) purely as a same-session convenience — separate from and not backed by the server-tracked `resumeRevisions` history that powers the durable per-message restore button above.

**Markdown**: assistant chat bubbles render through `react-markdown` (`components/latex-editor/chat-bubbles.tsx`) with tight custom spacing overrides — not raw HTML (`dangerouslySetInnerHTML`), since chat content can be influenced by scraped, untrusted job descriptions.

**Auto-save**: `useAutoSave` (manual-typing path only — chat turns persist immediately via `appendTurn` as they happen) debounces `useSaveLatex` 5 seconds, gated on `chatLoading` — the debounce timer does not schedule while a message is actively streaming, only once it finishes.

**Abort handling**: `executeAIEdit` clears its local ephemeral streaming-message state on *any* catch path, including `AbortError` — since that state was never persisted, there's nothing to reconcile.

**Out-of-sync UI**: `useLatexEditor` tracks an `outOfSync` flag set by any mutation's `onConflict` callback; `EditorHeader` shows a persistent badge (not just the toast) with a "Reload" action that re-fetches the document and resets local editor state.

**Keyboard shortcuts**: `Mod-s` save, `Mod-z`/`Mod-y` undo/redo, `Enter` sends a chat message, `Mod-Enter` submits any textarea-based form app-wide (`isSubmitShortcut` in `lib/utils.ts`), `?` opens a shortcuts cheat-sheet (`components/shortcuts-dialog.tsx`, wired from `components/navigation.tsx`), `Alt+←/→` cycles the main nav tabs. On `/jobs`, `c` opens the add-job dialog and `Esc` clears the active status filter — both guarded against firing while focus is inside a text input (see `isTypingTarget`-style checks in `jobs-list.tsx`/`navigation.tsx`).

### Chrome Extension (`extension/`)

Manifest V3 extension that shows resume match scores on LinkedIn job pages.

**Auth**: Background service worker reads `better-auth.session_token` cookie via `chrome.cookies.get` and passes it as a `Cookie` header to app API routes. Chrome extension background scripts bypass CORS for URLs in `host_permissions`.

**Content script flow**:
1. `GET_INIT` on bootstrap — fetches `appUrl`, `loggedIn`, and settings from the background.
2. `MutationObserver` watches for DOM changes; debounces injection 800ms after LinkedIn finishes rendering.
3. Inserts card before `[componentkey*="JobDetails_AboutTheJob_"]` (inline) or falls back to a fixed floating card.
4. Job description is read from `[data-testid="expandable-text-box"]` — the full text is in the DOM (CSS overflow, not lazy-loaded).

**One-shot save**: `SAVE_JOB` message sends job + analysis to `POST /api/jobs`, which runs a transaction: insert job → insert analysis → insert an empty `resumeDocuments` placeholder. This means opening `/editor?jobId=N` after saving from the extension never triggers consultation.

**Settings** (`chrome.storage.sync`): `autoAnalyze`, `autoSave`, `modelId`.

**Design tokens** (`card.css`): injected by the browser via `content_scripts.css` in the manifest. Token names map to `app/globals.css` oklch values — `--jm-bg`, `--jm-fg`, `--jm-bd`, `--jm-ac`, etc. The `[data-mode="float"]` selector switches to dark tokens. `--r: 0px` matches the app's `--radius`.

**App URL**: `manifest.json`'s `homepage_url` is the single source of truth — `background.js` reads it via `chrome.runtime.getManifest().homepage_url`. Production value is `https://resume.nandan.fyi`; change it to `http://localhost:3000` for local dev. Also update `host_permissions` in `manifest.json` if needed.

**To load locally**: `chrome://extensions` → Developer Mode → Load unpacked → select `extension/`.

### Storage

PDF resumes are stored in **Cloudflare R2** via `lib/r2.ts`. After upload, `generateLatexFromPdf` in `lib/resume-latex.ts` runs as a background task (Next.js `after()`) to convert the PDF to LaTeX and upsert it into the user's global `resumeDocuments` row (`jobId: null`) — an upsert, not a plain update, since that row may not exist yet for a first-time upload.

### Status display (`lib/status.ts`)

`STATUS_CONFIG` is a single `Record<JobStatus, { color: string; icon: string }>`. Use `STATUS_CONFIG[status].color` and `STATUS_CONFIG[status].icon` — there are no separate `STATUS_COLORS` or `STATUS_ICONS` exports.

### Environment variables

See `env.example` for all required variables. Key groups: `DATABASE_URL`, Resend (`RESEND_API_KEY`, `EMAIL_SENDER_*`), R2 (`R2_*`), better-auth (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`), Google AI (`GOOGLE_GENERATIVE_AI_API_KEY`), OpenAI (`OPENAI_API_KEY`), Mistral (`MISTRAL_API_KEY`), OpenRouter (`OPENROUTER_API_KEY`).

### Dev server logging (`next.config.ts`)

`logging.serverFunctions` is set to `false` — Next's default server-function dev logging dumps full argument values (e.g. an entire LaTeX document passed to a save action) to the terminal on every call, which is unreadable at this size.
