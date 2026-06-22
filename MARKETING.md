# JobMatch — Marketing Overview

## What is JobMatch?

JobMatch is an AI-powered web app that tells job seekers exactly how well their resume fits a specific role — and what to fix. Paste a job description, get a match score, a list of missing keywords, and concrete suggestions in seconds.

---

## The Problem

Most job seekers apply to dozens of roles with the same resume, hoping something sticks. They don't know:

- Why they're not getting callbacks
- Which keywords ATS scanners are looking for
- What to change to stand out for a specific role

Manually comparing a resume to a job description is tedious, inconsistent, and easy to get wrong.

---

## The Solution

JobMatch reads your resume as a PDF and compares it against any job description using AI. It returns:

- **A match score (0–100%)** — immediate signal on fit
- **Missing keywords** — the exact terms from the job description that aren't in your resume
- **Strengths** — what's already working in your favor
- **Improvement suggestions** — specific, actionable edits to close the gap
- **Pro tips** — additional insights from the AI coach

Results appear in seconds. No manual work, no guessing.

---

## Core Features

### Resume Match Analyzer
Upload your resume once. Paste any job description (or drop a URL to auto-fetch it). Get a detailed breakdown instantly. Switch AI models — Gemini or GPT — to compare outputs.

### Application Tracker
Track every application through the full job search pipeline:
`Submitted → Waiting → Interview → Offer → Accepted`

Every job is stored with its description so you can re-analyze at any time as your resume evolves.

### Resume Management
- Upload and store a PDF resume in the cloud
- Save your LaTeX source for version-controlled editing
- Built-in LaTeX editor with live preview and PDF export

### AI Preferences
Tell the AI what you're optimizing for — target role, experience level, priorities — and every analysis reflects your context.

---

## Who It's For

- **Active job seekers** applying to multiple roles and struggling to stand out
- **Career switchers** who need to understand what's missing from their resume for a new field
- **Engineers and technical candidates** who maintain a LaTeX resume and want a tighter workflow
- **Anyone tired of submitting blind** and not knowing why they're not getting responses

---

## Why JobMatch vs. the Alternatives

| | JobMatch | Generic AI chat | Resume review services |
|---|---|---|---|
| Reads your actual PDF | ✓ | Manual copy-paste | Varies |
| Per-job scoring | ✓ | No | No |
| Missing keyword list | ✓ | Inconsistent | Rarely |
| Application tracking | ✓ | No | No |
| LaTeX editing | ✓ | No | No |
| Seconds to result | ✓ | Minutes | Days |
| Free to run yourself | ✓ | Limited | No |

---

## How It Works

1. **Create an account** — Google or email/password
2. **Upload your resume** — PDF, stored securely in cloud storage
3. **Paste a job description** (or drop the URL and let JobMatch fetch it)
4. **Get your analysis** — score, gaps, strengths, and suggestions
5. **Track the application** — link the analysis to a tracked job and monitor its status

---

## Tech at a Glance

Built on a modern, serverless stack — fast to deploy, cheap to run.

- **Next.js 16** (App Router) — full-stack React framework
- **Neon PostgreSQL + Drizzle ORM** — serverless database
- **Cloudflare R2** — resume PDF storage
- **Google Gemini / OpenAI GPT** — AI analysis via Vercel AI SDK
- **Better Auth** — authentication (Google OAuth + email)
- **Resend** — transactional email
- **Tailwind CSS v4 + shadcn/ui** — UI

Deployable to Vercel in minutes. Self-hostable with your own API keys.

---

## Key Differentiator

JobMatch doesn't just chat about your resume — it **reads the actual PDF** and scores it against the actual job description, giving you a number you can act on. Then it keeps track of every application so your entire job search lives in one place.

---

---

# Design System & Visual Identity

## Aesthetic

JobMatch is a **precision tool for focused professionals**. The design is intentionally minimal, sharp, and data-forward — no decorative colour, no rounded corners, no noise. Every visual choice communicates confidence and clarity.

The overall mood: a Bloomberg terminal made beautiful. Clean enough to feel premium, purposeful enough to feel serious.

---

## Logo & Name

- **Name:** JobMatch
- **Logo:** A small square icon — a stylised "J" letterform — paired with the wordmark "JobMatch" in Geist Sans medium weight
- **Colour:** Always pure black on light backgrounds, pure white on dark backgrounds
- **Usage:** Never add colour, shadows, or effects to the logo

---

## Colour Palette

### Light mode (default)

| Role | Value | Description |
|---|---|---|
| Background | `#ffffff` (pure white) | Page background |
| Foreground | `#171717` (near-black) | Primary text, icons |
| Card | white at 82% opacity | Frosted glass surface |
| Border | `#e0e0e0` (light grey) | Dividers, outlines |
| Muted text | `#737373` (mid grey) | Secondary labels |
| Primary button | `#171717` fill, white text | CTA |
| Success | muted green | Match score high, offer/accepted status |
| Warning | muted amber | Partial match, no resume warning |
| Destructive | muted red | Low match, errors |
| Info | muted blue | Informational notices |

### Dark mode

| Role | Value | Description |
|---|---|---|
| Background | `#171717` (near-black) | Page background |
| Foreground | `#f5f5f5` (near-white) | Primary text, icons |
| Card | near-black at 85% opacity | Frosted glass surface |
| Border | white at 10% opacity | Subtle dividers |
| Primary button | `#f5f5f5` fill, black text | CTA |

**Key principle:** The palette is near-monochrome. Colour appears only for semantic states (score, status, alerts). Never decorative.

---

## Typography

### Typefaces
- **Geist Sans** — all UI text. Geometric, clean, slightly condensed. Designed by Vercel. Similar feel to Inter but with more personality.
- **Geist Mono** — all code, numbers in data contexts (match scores, line counts, zoom %). Creates a technical, precise feel.

### Type scale (in use)
| Use | Size | Weight | Notes |
|---|---|---|---|
| Page titles | 30px / 3xl | Bold (700) | Headings like "Analyze Match", "Applications" |
| Hero headline | 36–48px / 4xl–5xl | Bold | Landing page only |
| Section labels | 12px, uppercase, wide-tracked | Medium | "RECENT APPLICATIONS", status labels |
| Body / UI | 14px / sm | Normal | Form labels, descriptions, card text |
| Captions / meta | 12px / xs | Normal | Dates, secondary info |
| Monospace data | 14px | Normal | Match %, line counts, zoom level |

**Key principle:** No decorative type. Hierarchy comes from size and weight contrast, never from colour or italic styles.

---

## Shape & Corners

**Zero border radius everywhere.** All cards, buttons, inputs, dialogs, badges, and dropdowns are **perfectly square-cornered**. This is a deliberate design choice — it gives the UI a sharp, engineered quality that distinguishes it from rounded, "friendly" SaaS aesthetics.

This applies to:
- Cards
- Buttons (primary, outline, ghost)
- Form inputs and textareas
- Select dropdowns
- Dialog modals
- Toast notifications
- Status badges

---

## Surfaces & Depth

### Frosted glass cards
All cards are **semi-transparent frosted glass** — white at 82% opacity (light) or near-black at 85% opacity (dark), with `backdrop-filter: blur(12px)`. They float over the animated network background, giving depth without shadows.

### Layering system
1. **Background** — animated particle network canvas (fixed, full-viewport)
2. **Page layer** — authenticated content areas have a subtle 80% opaque background over the network
3. **Card layer** — frosted glass cards float on the page layer
4. **Overlay layer** — dialogs and dropdowns use stronger frosted glass (88% opacity + blur)
5. **Navigation** — sticky, 80% opaque with blur, always on top

### No shadows
There are no drop shadows anywhere. Depth is created by layering opacity and blur, not by simulating light sources.

---

## Animated Background

The signature visual element: a **living particle network** that covers the entire viewport.

- Animated dots (nodes) drift slowly across the screen
- Lines connect nearby nodes, fading based on proximity
- Speed is intentionally slow and calming — `max speed: 0.28px/frame`
- Colours match the theme: dark lines on white (light mode), light lines on dark (dark mode)
- The network reacts to viewport size — more nodes on larger screens
- Respects `prefers-reduced-motion` — turns off completely for accessibility

**Visual character:** Reminiscent of a neural network or a professional network map — deliberately referencing "connections" and "intelligence" without being literal.

On the **landing page and auth pages** (login, signup), the network is fully visible across the whole page — dramatic and immersive.

On **authenticated app pages**, a translucent overlay softens the network so it becomes a subtle texture behind the working UI rather than a distraction.

---

## Motion & Animation

All UI motion uses a **spring easing curve** (`cubic-bezier(0.16, 1, 0.3, 1)`) — fast start, smooth settle. Never bounce, never linear.

### Entry animations
Elements enter in staggered sequences using three effects:

| Name | Behaviour | Duration | Used on |
|---|---|---|---|
| `enter` | Fade in | 250ms | Fast elements, status chips |
| `enter-up` | Fade in + slide up 8px | 350ms | Cards, sections, buttons |
| `enter-blur` | Fade in + slide up 6px + blur clear | 500ms | Hero headline |
| `enter-scale` | Fade in + scale from 96% | 300ms | Dialogs |

Stagger delays are 60–80ms between sibling elements, up to 320ms total.

### Interactive micro-animations
- **Button hover:** A shimmer of light sweeps diagonally across the button over 700ms (`translateX(-110%) → translateX(110%)`)
- **Spotlight card:** A radial glow follows the mouse cursor across the card surface, appearing on hover and fading on leave (300ms transition)
- **Nav indicator:** A thin 1px line slides horizontally under the active tab with a spring animation
- **Count-up:** Numbers on the dashboard count up from 0 to their final value on page load
- **Focus ring:** Inputs/selects show a double-ring glow on focus — 1px border + 4px at 10% opacity

### What animation is NOT
No bouncing. No elastic overshoot. No auto-playing loops (except the background network). No loading spinners except inline in button text during async operations.

---

## Component Patterns

### Cards
- Square corners, 1px border, semi-transparent frosted glass background
- Consistent padding: 20–24px
- Used for all content sections — no bare tables or unstyled lists
- On the landing page, cards respond to cursor position with a spotlight glow effect

### Navigation
- Sticky header, 48px tall
- Logo left, tab links centre (desktop), controls right
- Active tab indicated by a thin 1px underline that animates between tabs
- Mobile: full-width dropdown with icon + label for each section

### Buttons
- **Primary:** Black fill (light) / White fill (dark), white/black text, shimmer on hover
- **Outline:** Transparent fill, border, fills muted on hover
- **Ghost:** No border, fills muted on hover
- **All:** Square, 36–40px height for standard, 32px for compact contexts

### Status badges
- Coloured background tint + matching text
- 7 states: submitted, waiting for response, rejected, interview, offer, accepted, withdrawn
- Represented with a leading emoji icon (clock, X, calendar, etc.)
- Square, compact, inline with content

### Score ring
- Circular SVG ring chart that fills based on match percentage
- Colour: green (≥80%), amber (≥60%), red (<60%)
- Number animates via count-up on render
- Used as the centrepiece of every analysis result

### Toast notifications
- Top-right position
- Frosted glass (12px blur), square corners
- Rich colours: green for success, red for error
- Auto-dismiss after a few seconds

---

## Voice & Tone

**Direct.** Every word earns its place. No filler phrases.

**Confident but not arrogant.** The product is useful. State that clearly without hype.

**Technical but accessible.** The audience includes engineers. Don't oversimplify, but don't gate behind jargon.

**Active voice.** "Get a match score" not "A match score will be provided."

### Word choices
| Use | Avoid |
|---|---|
| "Get started free" | "Sign up for free today!" |
| "See how well your resume fits" | "Unlock the power of AI resume matching" |
| "Missing keywords" | "AI-powered keyword insights" |
| "Concrete edits" | "Actionable, data-driven suggestions" |
| "In seconds" | "Lightning-fast", "instant" |

---

## Video / Motion Brief for AI

### Overall tone
Clean. Precise. Confident. The product does something real — show it doing it. No stock footage, no lifestyle shots, no abstract blur effects. Screen recording energy, elevated.

### Pacing
- **0–3s:** Hook — the problem in one sentence over the particle background
- **3–10s:** Show the landing page / hero — network animation, headline, clean UI
- **10–25s:** Demonstrate the core workflow — upload resume, paste job description, watch the analysis appear
- **25–35s:** Show the output — match score ring counting up, keyword gaps appearing, improvement suggestions
- **35–42s:** Show the tracker — job pipeline, status chips, organised job search
- **42–45s:** End card — logo, tagline, URL

### Visual treatment
- Record at 1280×800 minimum, preferably 1440p
- Dark mode preferred for video — higher contrast, more dramatic particle network
- Cursor should move deliberately, not erratically
- Text appearing on screen (typing into fields) should be at readable speed — slow enough to read
- Zoom in on key moments: the score ring, the keyword tags, the match percentage

### Key moments to capture
1. The animated network background filling the screen — establish the aesthetic
2. The "Land more interviews with AI resume matching" hero headline appearing with the blur-in animation
3. A PDF being uploaded to the resume page
4. A job URL being pasted and the "Fetch" button being clicked — description auto-filling
5. The "Analyze Match" button click — slight loading state
6. The score ring counting up (e.g., from 0 → 74%) with the amber colour
7. Missing keywords appearing as red tags one by one
8. The improvement suggestions list appearing staggered
9. The application tracker showing several jobs across different statuses
10. The LaTeX editor (optional) — split-pane code + preview

### Music direction
Minimal electronic. Focus on the product sound design (clicks, transitions). If music: understated, slightly technical. No corporate inspirational tracks.

### Text overlays / captions
Use the same typeface as the app: **Geist Sans**. Black on light backgrounds, white on dark. No rounded bubbles, no decorative frames. Text appears clean, same square aesthetic as the product.

Suggested captions:
- "Paste any job description."
- "Get your match score in seconds."
- "Know exactly what's missing."
- "Track every application."
- "Land more interviews."

### What to avoid
- Animated logos with complex transitions
- Stock photos of people looking at laptops
- Gradient colour explosions
- Rounded, "friendly" UI overlays that don't match the product aesthetic
- Upbeat corporate background music
- Generic AI marketing language ("revolutionary", "cutting-edge", "game-changing")
