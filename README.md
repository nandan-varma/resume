# JobMatch

AI-powered resume analyzer and job application tracker.

## What it does

- **Resume analysis** — paste a job description (or URL) and get an AI match score, missing keywords, and concrete improvement suggestions against your uploaded resume
- **Application tracker** — track every application through the full pipeline (submitted → interview → offer → accepted)
- **Resume management** — store your PDF resume and LaTeX source in the cloud

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Auth | Better Auth |
| Database | Neon (PostgreSQL) + Drizzle ORM |
| Storage | Cloudflare R2 |
| Email | Resend + React Email |
| AI | Vercel AI SDK — Google Gemini / OpenAI |
| UI | Tailwind CSS v4 + shadcn/ui |

## Getting started

### 1. Clone and install

```bash
git clone <repo>
cd resume
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in all values. Required services:

- **Neon** — serverless PostgreSQL ([neon.tech](https://neon.tech))
- **Cloudflare R2** — object storage for PDF resumes
- **Resend** — transactional email for auth flows ([resend.com](https://resend.com))
- **Google Generative AI** or **OpenAI** — AI analysis

### 3. Run database migrations

```bash
npx drizzle-kit push
```

### 4. Start

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run check` | Lint + type-check |
| `npm run fix` | Auto-fix lint |
| `npx drizzle-kit push` | Apply schema to database |
| `npx drizzle-kit studio` | Open database GUI |

## Deployment

Deploy to Vercel. Set all environment variables in project settings. Ensure `BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` point to your production domain.
