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
- Protected routes: `/dashboard`, `/jobs`, `/analyze`, `/settings`, `/resume`, `/editor`.
- Server-side auth for pages: call `getCurrentUser()` from `server/users.ts` at the top of any page — it redirects to `/login` on failure.

### Server actions (`server/`)

Actions are split by domain. All import the shared React-cached `getSession` from `server/session.ts` — this deduplicates session lookups within a single render pass.

| File | Exports |
|---|---|
| `server/users.ts` | `getCurrentUser`, `signIn`, `signUp` |
| `server/jobs.ts` | `createJob`, `getJobs`, `updateJobStatus`, `deleteJob` |
| `server/resume.ts` | `uploadResume`, `getPersonalInformation`, `saveAiPreferences`, `saveResumeLatex` |
| `server/analysis.ts` | `saveAnalysis`, `getAnalysisByJobId` |
| `server/session.ts` | `getSession`, `requireSession` (internal, not called from client) |

### Database (`db/`)

Drizzle ORM on Neon (serverless PostgreSQL). Schema in `db/schema.ts`; use `db.query.*` for relational queries and `db.insert/update/delete` for mutations. The `Job` type is exported from schema as `typeof jobs.$inferSelect`.

The `analysis` table stores `strengths`, `missingKeywords`, and `improvementSuggestions` as JSON-serialized `text` columns — callers in `server/analysis.ts` handle `JSON.stringify`/`JSON.parse` explicitly.

### AI models (`lib/models.ts`)

- `resolveModel(id: string)` — use this in API routes; falls back to `DEFAULT_MODEL_ID` if `id` is invalid.
- `getModelInstanceById(id: ModelId)` — returns a provider instance directly; throws if the id is unknown.
- Default model: `gemini-3-flash-preview`.

### Page pattern

Pages are server components that call `getCurrentUser()` (for auth guard) plus any data fetches in `Promise.all`. They pass data down to `*-client.tsx` client components. The `<Navigation activeTab="...">` component is placed in each page (not in a shared layout) because each tab needs a different `activeTab` prop.

### LaTeX editor (`/editor`)

The editor page uses `texlyre-busytex` — a WASM LaTeX compiler that runs in the browser. The `texlive-extra.data` file (~324 MB) is served via an UploadThing CDN redirect configured in `next.config.ts`. The WASM engine is lazy-loaded and cached via refs; do not import `texlyre-busytex` statically.

### Status display (`lib/status.ts`)

`STATUS_CONFIG` is a single `Record<JobStatus, { color: string; icon: string }>`. Use `STATUS_CONFIG[status].color` and `STATUS_CONFIG[status].icon` — there are no separate `STATUS_COLORS` or `STATUS_ICONS` exports.

### Storage

PDF resumes are stored in **Cloudflare R2** via `lib/r2.ts`. After upload, `generateLatexFromPdf` in `lib/resume-latex.ts` runs as a background task (Next.js `after()`) to convert the PDF to LaTeX and store it in the database.

### Environment variables

See `env.example` for all required variables. Key groups: `DATABASE_URL`, Resend (`RESEND_API_KEY`, `EMAIL_SENDER_*`), R2 (`R2_*`), better-auth (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`), Google AI (`GOOGLE_GENERATIVE_AI_API_KEY`), OpenAI (`OPENAI_API_KEY`).
