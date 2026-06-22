# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Architecture

### Auth & middleware

- **`proxy.ts`** exports `proxy` (the middleware function) and `config` (the matcher). Next.js picks this up as `middleware.ts` via a config alias — do not rename it to `middleware.ts`.
- Auth is **better-auth** (`lib/auth.ts` server, `lib/auth-client.ts` client). The session cookie is `better-auth.session_token`.
- The middleware's `PROTECTED` list covers `/dashboard`, `/jobs`, `/analyze`, `/settings`, `/resume`. The `/editor` route is outside the `(protected)` group but protected via `getCurrentUser()` → `requireSession()` which redirects to `/login`.
- Server-side auth: `app/(protected)/layout.tsx` calls `requireSession()` from `server/session.ts`, which redirects to `/login` on failure. Individual protected pages do **not** need their own auth guard.

### Server actions (`server/`)

Actions are split by domain. All import the shared React-cached `getSession` from `server/session.ts` — this deduplicates session lookups within a single render pass.

| File | Exports |
|---|---|
| `server/users.ts` | `getCurrentUser`, `signIn`, `signUp` |
| `server/jobs.ts` | `createJob`, `getJobs`, `updateJobStatus`, `deleteJob`, `getJobById` |
| `server/resume.ts` | `uploadResume`, `getPersonalInformation`, `saveAiPreferences`, `saveResumeLatex`, `getJobResume`, `saveJobResumeLatex` |
| `server/analysis.ts` | `saveAnalysis`, `getAnalysisByJobId` |
| `server/session.ts` | `getSession`, `requireSession` (internal, not called from client) |

**Server actions as queryFn**: `getJobs` and `getPersonalInformation` are used as `queryFn` in TanStack Query hooks. On initial load the data is hydrated from the server, so the queryFn only runs client-side on stale refetches. **Mutations** (`createJob`, `deleteJob`, etc.) are the primary intended client-side use of server actions.

### Database (`db/`)

Drizzle ORM on Neon (serverless PostgreSQL). Schema in `db/schema.ts`; use `db.query.*` for relational queries and `db.insert/update/delete` for mutations. The `Job` type is exported from schema as `typeof jobs.$inferSelect`.

Key tables:
- `personalInformation` — one row per user; stores global `resumeLatex`, `resumeUrl`, `aiPreferences`, and `chatMessages` (JSONB).
- `jobResumes` — per-job resume variant; stores `resumeLatex` and `chatMessages` (JSONB). Unique on `(jobId, userId)`. Upserted via `onConflictDoUpdate`.
- `analysis` — stores `strengths`, `missingKeywords`, and `improvementSuggestions` as JSON-serialized `text` columns — callers in `server/analysis.ts` handle `JSON.stringify`/`JSON.parse` explicitly.

### TanStack Query

**`app/get-query-client.ts`** — singleton factory. Uses React's `cache()` so all server components in a single request share one `QueryClient`; the browser gets a module-level singleton. Pending queries are included in dehydration to enable streaming.

**`lib/queries/`** — hooks split by domain:
- `jobs.ts`: `useJobs()` (suspense), `useCreateJob()`, `useDeleteJob()`, `useUpdateJobStatus()` — delete and status mutations do optimistic updates with rollback.
- `resume.ts`: `usePersonalInfo()` (suspense), `useSaveAiPreferences()` — save updates the cache directly on success.

**Page pattern** for protected routes:
1. Server component page calls `getQueryClient()`, fires `prefetchQuery` (no `await` — streaming), wraps children in `<HydrationBoundary state={dehydrate(queryClient)}>`.
2. Client components call `useSuspenseQuery` (via the hooks above) — data is immediately available from the hydrated cache on first render; a `<Suspense>` boundary in the page shows a skeleton during streaming.
3. Write operations use `useMutation` hooks from `lib/queries/`.

`staleTime` is 5 minutes globally — queries will not refetch on every navigation.

### AI models (`lib/models.ts`)

- `resolveModel(id: string)` — use this in API routes; falls back to `DEFAULT_MODEL_ID` if `id` is invalid.
- `getModelInstanceById(id: ModelId)` — returns a provider instance directly; throws if the id is unknown.
- Default model: `gemini-3-flash-preview`. Model selection is persisted to localStorage via `useModelId()` in `lib/use-model-id.ts` (`MODEL_STORAGE_KEY`).

### API routes (`app/api/`)

| Route | Purpose |
|---|---|
| `auth/[...all]` | better-auth catch-all handler |
| `edit-latex` | Streaming LaTeX edits — uses `streamObject` + `toTextStreamResponse()` |
| `job-customize` | Consultation questions for tailoring resume to a job |
| `analysis` | AI resume-vs-job match scoring |
| `analyze` | Orchestrates fetch-job + analysis |
| `fetch-job` | Scrapes job description from a URL |
| `upload-resume` | Handles PDF upload to R2, triggers background LaTeX generation |

All routes validate the session via `auth.api.getSession({ headers: req.headers })` and parse the request body with Zod before any AI calls.

### LaTeX editor (`/editor`)

The editor page is at `/editor` (global resume) or `/editor?jobId=N` (job-specific resume). The page resolves `initialLatex` as `jobResume.resumeLatex || personalInfo.resumeLatex`. `isNewJobResume` is true when a job is selected but no `jobResume` row exists yet — this triggers the AI consultation flow.

The editor uses `texlyre-busytex` — a WASM LaTeX compiler that runs in the browser. The `texlive-extra.data` file (~324 MB) is served via UploadThing CDN; `busytex.wasm` and `busytex.js` are served from a custom R2 bucket. All three are redirected in `next.config.ts`. Do not import `texlyre-busytex` statically — it is lazy-loaded and cached via refs.

**Streaming edits**: `edit-latex` uses `streamObject` server-side. The client (`use-ai-chat.ts`) reads the body stream chunk-by-chunk, calls `parsePartialJson` (from AI SDK) on each chunk to extract the partial `explanation`, and updates the chat bubble in real time with a blinking cursor. Edits are applied once the stream is complete.

**Auto-save**: 5-second debounce after any change. Saves to `jobResumes` when a job is active, otherwise to `personalInformation`. Both LaTeX and chat messages are saved together.

### Status display (`lib/status.ts`)

`STATUS_CONFIG` is a single `Record<JobStatus, { color: string; icon: string }>`. Use `STATUS_CONFIG[status].color` and `STATUS_CONFIG[status].icon` — there are no separate `STATUS_COLORS` or `STATUS_ICONS` exports.

### Storage

PDF resumes are stored in **Cloudflare R2** via `lib/r2.ts`. After upload, `generateLatexFromPdf` in `lib/resume-latex.ts` runs as a background task (Next.js `after()`) to convert the PDF to LaTeX and store it in the database.

### Environment variables

See `env.example` for all required variables. Key groups: `DATABASE_URL`, Resend (`RESEND_API_KEY`, `EMAIL_SENDER_*`), R2 (`R2_*`), better-auth (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`), Google AI (`GOOGLE_GENERATIVE_AI_API_KEY`), OpenAI (`OPENAI_API_KEY`).
