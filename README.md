# JobMatch

Search real jobs, then get a resume and cover letter written for the one you pick. Jobs come from [Tallo](https://tallo.nandan.fyi); writing uses only the facts you provide.

## Run it

```bash
pnpm install
cp .dev.vars.example .dev.vars   # add OPENAI_API_KEY and a random BETTER_AUTH_SECRET
pnpm db:migrate:local
pnpm dev                         # http://localhost:4321
```

Locally you can sign in with an email and password. In production, sign-in is GitHub only (`GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`).

## Deploy (Cloudflare Workers)

```bash
pnpm exec wrangler d1 create jobmatch      # put the id in wrangler.jsonc
pnpm db:migrate:remote
pnpm exec wrangler secret bulk <(echo '{"BETTER_AUTH_SECRET":"…","BETTER_AUTH_URL":"https://your.domain","OPENAI_API_KEY":"…","GITHUB_CLIENT_ID":"…","GITHUB_CLIENT_SECRET":"…"}')
pnpm deploy
```

The GitHub OAuth callback URL is `<BETTER_AUTH_URL>/api/auth/callback/github`. See `CLAUDE.md` for the code layout.
