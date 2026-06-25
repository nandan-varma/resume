# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Always use ponytail skill

## Commands

```bash
pnpm dev          # dev server (Turbopack)
pnpm build        # production build (runs scripts/download-busytex.mjs first)
pnpm check        # biome lint + format check
pnpm fix          # auto-fix biome issues
npx tsc --noEmit  # TypeScript type check (no build script for this)

npx drizzle-kit push    # apply schema changes to the database
npx drizzle-kit studio  # open database GUI
npx drizzle-kit generate  # generate migration files
```

There are no tests. The linter is **Biome** (configured in `biome.jsonc`, extends `ultracite`). `pnpm fix` handles most auto-fixable issues; run `pnpm check` to verify.

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
| `server/resume.ts` | `uploadResume`, `getPersonalInformation`, `saveAiPreferences`, `saveResumeLatex`, `getJobResume`, `saveJobResumeLatex` |
| `server/analysis.ts` | `saveAnalysis`, `getAnalysisByJobId` |
| `server/session.ts` | `getSession`, `requireSession` (internal, not called from client) |

### Database (`db/`)

Drizzle ORM on Neon (serverless PostgreSQL). Schema in `db/schema.ts`; use `db.query.*` for relational queries and `db.insert/update/delete` for mutations.

Key tables:
- `personalInformation` — one row per user; stores global `resumeLatex`, `resumeUrl`, `aiPreferences`, `chatMessages` (JSONB).
- `jobResumes` — per-job resume variant; stores `resumeLatex` and `chatMessages` (JSONB). Unique on `(jobId, userId)`. Upserted via `onConflictDoUpdate`.
- `analysis` — stores `matchPercentage`, `summary`, `additionalInsights`, and `strengths`/`missingKeywords`/`improvementSuggestions` as **JSONB** (`string[]`). No manual `JSON.stringify`/`JSON.parse` needed — Drizzle handles it via `.$type<string[]>()`.

### TanStack Query

**`app/get-query-client.ts`** — singleton factory. Uses React's `cache()` so all server components in a single request share one `QueryClient`; the browser gets a module-level singleton.

**`lib/queries/`** — hooks split by domain:
- `jobs.ts`: `useJobs()`, `useCreateJob()`, `useDeleteJob()`, `useUpdateJobStatus()` — delete and status mutations do optimistic updates with rollback.
- `resume.ts`: `usePersonalInfo()`, `useJobResume(jobId)`, `useSaveAiPreferences()`, `useSaveEditorState(jobId | null)` — save mutations update the cache directly so navigation back is instant.
- `analyze.ts`: `useFetchJobDescription()`, `useAnalyzeMatch()`.

**Page pattern** for protected routes:
1. Server component calls `getQueryClient()`, fires `prefetchQuery` (no `await` — streaming), wraps children in `<HydrationBoundary state={dehydrate(queryClient)}>`.
2. Client components call `useSuspenseQuery` via the hooks above — data is immediately available from the hydrated cache; a `<Suspense>` boundary shows a skeleton during streaming.
3. Write operations use `useMutation` hooks.

**Editor pattern**: The editor page fetches data server-side, then seeds the cache via `queryClient.setQueryData` (data already in hand — avoids a duplicate fetch), then wraps in `HydrationBoundary`. `useSaveEditorState` mutations update `["job-resume", jobId]` or `["personal-info"]` on success.

`staleTime` is 5 minutes globally.

### API routes (`app/api/`)

| Route | Purpose |
|---|---|
| `auth/[...all]` | better-auth catch-all handler |
| `edit-latex` | Streaming LaTeX edits — uses `streamObject` + `toTextStreamResponse()` |
| `job-customize` | Consultation questions for tailoring resume to a job |
| `analyze` | AI resume-vs-job match scoring; returns cached analysis if `jobId` provided |
| `fetch-job` | Scrapes job description from a URL |
| `upload-resume` | Handles PDF upload to R2, triggers background LaTeX generation |
| `jobs` | POST — creates a job; accepts optional `analysis` payload to save analysis + empty `jobResume` in one transaction |

All routes validate the session via `auth.api.getSession({ headers: req.headers })` and parse the request body with Zod before any AI calls.

### AI models (`lib/models.ts`)

- `resolveModel(id: string)` — use in API routes; falls back to `DEFAULT_MODEL_ID` if `id` is invalid.
- Default model: `gemini-3-flash-preview`. Model selection is persisted to localStorage via `useModelId()` (`MODEL_STORAGE_KEY`).

### LaTeX editor (`/editor`)

URL: `/editor` (global resume) or `/editor?jobId=N` (job-specific).

`isNewJobResume` triggers the AI consultation flow. It is `true` only when: a job is selected **AND** no `jobResume` row exists **AND** no `analysis` row exists for that job. Saving a job from the Chrome extension (which stores analysis + creates an empty `jobResume` placeholder in a single transaction) means `isNewJobResume` is always `false` on subsequent editor opens.

Chat messages are intentionally isolated: when `jobId` is present, `initialChatMessages` comes from `jobResume.chatMessages` only (empty array if no jobResume, never falls through to `personalInfo.chatMessages`). This prevents global resume chat history from appearing in job-specific editors.

The editor uses `texlyre-busytex` — a WASM LaTeX compiler. Do not import it statically — it is lazy-loaded and cached via refs. `busytex.wasm`, `busytex.js`, and `texlive-extra.data` are all redirected in `next.config.ts`.

**Streaming edits**: `edit-latex` uses `streamObject` server-side. The client (`use-ai-chat.ts`) reads the body stream chunk-by-chunk, calls `parsePartialJson` on each chunk, and updates the chat bubble in real time.

**Auto-save**: `useAutoSave` uses `useSaveEditorState` (TanStack Query mutation) with a 5-second debounce. On success the mutation updates the query cache so the data is fresh for the next navigation without a re-fetch.

### Chrome Extension (`extension/`)

Manifest V3 extension that shows resume match scores on LinkedIn job pages.

**Auth**: Background service worker reads `better-auth.session_token` cookie via `chrome.cookies.get` and passes it as a `Cookie` header to app API routes. Chrome extension background scripts bypass CORS for URLs in `host_permissions`.

**Content script flow**:
1. `GET_INIT` on bootstrap — fetches `appUrl`, `loggedIn`, and settings from the background.
2. `MutationObserver` watches for DOM changes; debounces injection 800ms after LinkedIn finishes rendering.
3. Inserts card before `[componentkey*="JobDetails_AboutTheJob_"]` (inline) or falls back to a fixed floating card.
4. Job description is read from `[data-testid="expandable-text-box"]` — the full text is in the DOM (CSS overflow, not lazy-loaded).

**One-shot save**: `SAVE_JOB` message sends job + analysis to `POST /api/jobs`, which runs a transaction: insert job → insert analysis → insert empty `jobResume`. This means opening `/editor?jobId=N` after saving from the extension never triggers consultation.

**Settings** (`chrome.storage.sync`): `autoAnalyze`, `autoSave`, `modelId`.

**Design tokens** (`card.css`): injected by the browser via `content_scripts.css` in the manifest. Token names map to `app/globals.css` oklch values — `--jm-bg`, `--jm-fg`, `--jm-bd`, `--jm-ac`, etc. The `[data-mode="float"]` selector switches to dark tokens. `--r: 0px` matches the app's `--radius`.

**To load locally**: `chrome://extensions` → Developer Mode → Load unpacked → select `extension/`. Update `APP_URL` in `background.js` and `host_permissions` in `manifest.json` before publishing.

### Storage

PDF resumes are stored in **Cloudflare R2** via `lib/r2.ts`. After upload, `generateLatexFromPdf` in `lib/resume-latex.ts` runs as a background task (Next.js `after()`) to convert the PDF to LaTeX and store it in the database.

### Status display (`lib/status.ts`)

`STATUS_CONFIG` is a single `Record<JobStatus, { color: string; icon: string }>`. Use `STATUS_CONFIG[status].color` and `STATUS_CONFIG[status].icon` — there are no separate `STATUS_COLORS` or `STATUS_ICONS` exports.

### Environment variables

See `env.example` for all required variables. Key groups: `DATABASE_URL`, Resend (`RESEND_API_KEY`, `EMAIL_SENDER_*`), R2 (`R2_*`), better-auth (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`), Google AI (`GOOGLE_GENERATIVE_AI_API_KEY`), OpenAI (`OPENAI_API_KEY`), Mistral (`MISTRAL_API_KEY`).
