# JobMatch

Search real jobs, then get a resume and cover letter written for the one you pick. Built for people who have never written a resume: no code, no jargon, no LaTeX.

- **Find jobs.** Live openings from [Tallo](https://tallo.nandan.fyi), with a split view, a local skill match ("you have 5 of the 7 tools it names") and filters you can undo with one click.
- **Your profile.** Drop a PDF (or paste text) and it fills in your master resume. Everything we write comes from it; nothing is invented.
- **A resume and letter for each job.** One click, about 20 seconds. Edit any line directly on the page, with undo, autosave and a live page-fit meter. Download a one-page (or two-page) PDF on A4 or US Letter.
- **ATS-safe by design.** Single column, Arial 10pt, real headings, links that stay clickable, and a PDF whose text reads in order.
- **Settings.** Theme, paper size, one or two pages, writing tone and your own rules, download all your data, delete your account.

## Run it

```bash
pnpm install
cp .dev.vars.example .dev.vars   # add OPENAI_API_KEY and a random BETTER_AUTH_SECRET
pnpm db:migrate:local
pnpm dev                         # http://localhost:4321
```

Locally you can sign in with an email and password. In production, sign-in is GitHub only (`GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`).

## Checks

```bash
pnpm check   # Biome and astro check (the pre-commit hook runs it)
pnpm test    # Vitest: pure logic, no network
```

The tests drive the whole AI pipeline with deliberately dead, sloppy, lying and hostile fake models, so quality does not depend on which model is plugged in.

## Deploy (Cloudflare Workers)

```bash
pnpm exec wrangler d1 create jobmatch      # put the id in wrangler.jsonc
pnpm db:migrate:remote                     # always before deploying code that needs new tables
pnpm exec wrangler secret bulk <(echo '{"BETTER_AUTH_SECRET":"…","BETTER_AUTH_URL":"https://your.domain","OPENAI_API_KEY":"…","GITHUB_CLIENT_ID":"…","GITHUB_CLIENT_SECRET":"…"}')
pnpm deploy
```

The GitHub OAuth callback URL is `<BETTER_AUTH_URL>/api/auth/callback/github`.

## Good to know

- **AI cost.** Each account gets 25 AI actions a day (a resume, a letter, an import). Change `DAILY_AI_LIMIT` in `src/lib/credits.ts`.
- **Privacy.** Uploaded PDFs are read once and never stored. Settings has a full data download and account deletion.
- **Other AI providers.** `src/lib/ai.ts` is the only file that talks to a provider; everything else works on text in, text out.

See `CLAUDE.md` for the code layout and conventions.
