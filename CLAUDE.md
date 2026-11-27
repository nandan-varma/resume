# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

JobMatch: search real jobs (via the [Tallo](https://tallo.nandan.fyi/llms.txt) API), then generate a resume and cover letter tailored to the one you pick. Built for beginners: no code, no jargon, no LaTeX.

Stack: **Astro 7** (SSR) on **Cloudflare Workers**, **D1** + Drizzle, **better-auth** (GitHub sign-in), **Vercel AI SDK** with OpenAI, Tailwind 4 with shadcn-style tokens, view transitions, React islands only where interactive. No form library: the resume is edited in place on the page itself. Keep it minimal: prefer a library or config over hand-written code.

## Commands

```bash
pnpm dev                 # local dev (reads .dev.vars; copy .dev.vars.example)
pnpm check               # Biome + astro check (the pre-commit hook runs this)
pnpm fix                 # Biome auto-fix
pnpm test                # Vitest (pure functions only)
pnpm db:generate         # new Drizzle migration after editing src/db/schema.ts
pnpm db:migrate:local    # apply migrations to the local D1
pnpm db:migrate:remote   # apply migrations to production D1
pnpm gen:tallo           # regenerate src/lib/tallo-api.d.ts from Tallo's OpenAPI
pnpm gen:types           # regenerate worker-configuration.d.ts after wrangler.jsonc/.dev.vars changes
pnpm deploy              # build + wrangler deploy
```

## Layout

- `src/pages/` routes: `/` search (list + job side panel), `/jobs/[id]`, `/profile` (master resume), `/resumes` (cards), `/resumes/[id]` (editor), `/login`, `/api/auth/[...all]`.
- `src/actions/index.ts` every server mutation (Astro Actions with Zod). Each calls `requireUser`. The editors send the whole resume (`saveResume`, `saveApplication`) on autosave.
- `src/lib/resume.ts` **single source of truth** for a resume (Zod). `completeness` drives the profile checklist. Stored JSON is always re-parsed through the schema on read, so older rows get defaults.
- `src/lib/resume-diff.ts` how a tailored resume differs from the profile (reworded jobs and projects, chosen projects); `src/lib/skills.ts` the local, no-AI skill match shown on a job; `src/lib/job-detail.ts` everything the job panel needs (used by the page and by the `jobDetail` action).
- `src/lib/layout.ts` page-fit model: simulates word wrapping with Arial's real glyph widths (within 0.4 line of Chrome; calibrated in `layout.test.ts`), for A4 and US Letter. Used to budget the AI's output and by `trimToFit`. The editor itself measures the real DOM. `pages` (1 or 2) scales the budget. Recalibrate if `.resume-sheet` typography changes.
- **AI** (`src/lib/ai.ts` is the only file that talks to a provider; `createAsk` is where BYOK keys and other providers plug in). Everything else is `src/lib/pipeline/`, plain text in and text out:
  - `json.ts` extract and repair JSON from any reply, `askJson` retries while showing the model its mistake. `schemas.ts` lenient reply shapes. `guards.ts` rejects invented numbers/tools, enforces house style (single hyphen, no emoji), validates summaries and letters. `fallback.ts` deterministic plan, blocker detection and cover-letter template: the floor when a model is bad or offline.
  - `tailor.ts` plan, then bullets per item (parallel, each guarded), then summary and letter as separate calls, then assemble from the profile, fill spare room and `trimToFit`. A model can only lower polish, never correctness. `import.ts` contact facts come from regex, and entries not in the document are dropped. `suggest.ts`. `prompts.ts` short, numbered rules with a JSON example per step.
  - Tests drive the whole pipeline with dead, lying, sloppy and hostile fake models (`pipeline.test.ts`); no network.
- `src/lib/skills.ts` local skill match, spelling aligned to the posting. `src/lib/links.ts` where contact text should link, and company avatar colours. `src/lib/text.ts` strips emoji, dingbats and invisible characters (they break ATS parsing and Arial cannot draw them).
- `src/lib/resume.ts` one Zod schema validates AI output and everything the editors save; `tidy` is applied on save. `Prefs` holds paper (A4 default), length (1 or 2 pages), tone and rules.
- `src/lib/credits.ts` a daily limit of AI actions per account (one atomic upsert into `ai_usage`; `withCredit` refunds if the action fails). Every action that calls a model goes through it.
- `src/components/ResumeSheet.tsx` the WYSIWYG page: every string is an `Editable` (`contenteditable="plaintext-only"`, no editor library). Edits go through `useDoc` (`edit(key, change)`, undo/redo, debounced autosave); edits with the same key within a second merge into one undo step. Editing aids carry `.rs-np` and are hidden when printing and when measuring the page fit. `mode="page"` is one page of the chosen paper (A4 default, set in Settings); `"flow"` grows (profile). Print uses `@page` margins and never clips: an overlong resume flows to a second page. In print every element is `position: static` so the PDF text reads in document order (name, contact, sections), and links are real link annotations (`.rs-print-link` replaces the editable text).
- `ProfileEditor.tsx` first run (drop a PDF or paste text, or start blank) then the sheet plus checklist, summary options, notes. `ApplicationEditor.tsx` resume/cover letter tabs, fit meter, "what we changed", PDF (browser print; the page title becomes the file name). `ResultsBrowser.tsx` + `JobDetail.tsx` the search split view (below `lg` rows link to `/jobs/[id]`). `SettingsPage.tsx` (`/settings`: theme, paper, tone and rules, data export, safe account deletion). `WorkOverlay.tsx` the full-screen progress view for slow AI steps; `TailorButton.tsx` uses it.
- `src/db/schema.ts` `profile` and `application` (one tailored resume per user and posting). `auth-schema.ts` is generated by the better-auth CLI.
- `src/styles/global.css` Notion-style tokens, tag colors, motion (`rise`, `pop`, `skeleton`, reduced-motion respected), the printable `.resume-sheet` and its editing styles. The theme is `data-theme` on `<html>`, set by an inline script in the layout and re-applied after each page transition.
- Navigation is a visible top bar (bottom tab bar on phones) with Astro view transitions (`ClientRouter`) and a ⌘K palette.

## Conventions and gotchas

- Bindings come from `import { env } from "cloudflare:workers"`. Secrets live in `.dev.vars` locally and `wrangler secret` in production.
- Biome is configured **not** to rewrite imports in `.astro` files (`useImportType` off): it cannot see template usage and would break them.
- The editors save whole resumes; Zod fills blanks on the server, and `Editable` is plain text only (Enter and pasted line breaks never add a newline).
- Email/password sign-in exists only in dev (`import.meta.env.DEV`) so the app can be tried without OAuth keys.
- Reading a resume or writing a letter never saves by itself: the editor applies the result as an undoable edit and autosave is the only way a profile or resume changes.
- Never commit `.dev.vars`. Don't hand-edit `migrations/` or `tallo-api.d.ts`.
