# WORKING_COPY.md

A multi-route, editorial field manual and interactive engineering workbench built around plain-text Markdown/MDX sources. Designed around quiet typography, tactile motion, strict accessibility and bundle budgets, offline-ready PWA caching, and a community Wall backed by Supabase and Vercel Serverless Functions.

**Live site:** [manifestomd.vercel.app](https://manifestomd.vercel.app)

---

## Overview

`WORKING_COPY.md` treats software engineering principles as a living plain-text document rather than static prose:

- **Shared Plain-Text Core (`EDITORIAL | RAW .MD`)**: Every route can switch cleanly between its rendered editorial view and a line-numbered plain-Markdown source view (`RawMarkdownView`) with syntax coloring, one-click copy, `.md` download, and `localStorage` persistence.
- **Zod-Validated MDX Content Collections (`/content`)**: Principles, postmortem bug exhibits, git-style commit notes, and bookshelf/workbench items live in typed `.mdx` files verified at build time by [`vite-content-plugin.ts`](vite-content-plugin.ts) and [`src/lib/contentSchema.ts`](src/lib/contentSchema.ts).
- **Interactive Engineering Sandboxes**: Alongside the core manifesto on `/`, the site includes ten sub-routes (`Commit History`, `Bug Museum`, `Books & Workbench`, `Naming Game`, `Generative Canvas`, `Subtracting Code`, `Principle of the Day`, `Quiet Focus Room`, `Interactive Shell`, and `Community Wall`) plus long-form `/notes/:collection/:slug` essays, `/privacy`, and `/admin`.
- **Backend API & Community Moderation (`/api` + Supabase)**: `/wall` submissions, rate-limited likes, `/admin` moderation & CSV/JSON export, client error reporting, and `/api/health` checks run as ESM Vercel Serverless Functions backed by Supabase PostgreSQL and RLS.
- **Strict Budgets & Cross-Device QA**: Initial payload budgets (`<= 85 kB` initial JS gzip, `<= 150 kB` critical payload), mid-range mobile Core Web Vitals checks (`LCP <= 2000 ms`, `CLS <= 0.05`, `INP <= 200 ms`), Lighthouse CI assertions, `axe-core` accessibility audits, and a 9-device Playwright responsive suite.

---

## Routes & Site Map

Navigation across the app is driven from a single typed source of truth in [`src/lib/routes.ts`](src/lib/routes.ts) and [`src/lib/pageShellMeta.ts`](src/lib/pageShellMeta.ts), powering the Priority+ header bar, `Field Index [+]` overlay, `Cmd/Ctrl + K` Command Palette, `PageShell` breadcrumbs & prev/next footers, and [`public/sitemap.xml`](public/sitemap.xml).

### `01 / read` — Read & Reference

| Route | Label | Description |
| --- | --- | --- |
| `/` | `/home` | Hero title plate, 6 pinned opening statements, full-bleed interlude, Principle of the Day card, 10 working notes (`#read`), Closing checklists (`#closing`), and sign-off. |
| `/commit-log` | `/commit-log` | 10 working principles rendered as git commits, inline removed/added diffs, and honest blame notes. |
| `/bug-museum` | `/bug-museum` | 8 anonymized production postmortem exhibits with incident context, cost, failing/fixed diffs, modal inspection, and mobile swipe cards. |
| `/shelf` | `/shelf` | 10 curated engineering books across tactile shelf spines plus 4 daily workbench tools (`editor`, `terminal`, `note-taking`, `debugging`). |

### `02 / play` — Play & Practice

| Route | Label | Description |
| --- | --- | --- |
| `/naming` | `/naming` | 10-round interactive naming challenge replacing vague production identifiers for an engineer debugging at 2am, scored with live readability feedback. |
| `/playground` | `/playground` | Live Canvas 2D generative flow-field and editorial geometry sandbox with live code evaluation, parameter sliders (bottom sheet on mobile), shareable URL hash seeds, and PNG export. |
| `/delete` | `/delete` | Three before/after refactoring comparisons (`CodeCompareSlider`) showing `4,000 -> 400` line reductions, plus a 12-line interactive red-pencil trimming game (`DeleteLineGame`). |

### `03 / tools` — Tools & Daily Workbench

| Route | Label | Description |
| --- | --- | --- |
| `/today` | `/today` | Deterministic UTC-date seeded Principle of the Day with date stepping, optional browser reminders, and `1080x1080` PNG social card generation. |
| `/focus` | `/focus` | Calm deep-work timer (`25/5`, `50/10`, custom presets) with Space/R shortcuts, synthesized Web Audio ambient rain (off by default), and private local session logging. |
| `/terminal` | `/terminal` | Interactive `working_copy.md` command prompt supporting 14 commands (`help`, `ls`, `cat`, `random`, `accent`, `coffee`, etc.), `Tab` completion, history navigation, and a touch key row (`Tab`, `↑`, `↓`, `Ctrl-C`) on mobile. |
| `/wall` | `/wall` | Community margin-note wall for 140-character engineering principles with live character counter, bot/timing validation, salted per-IP rate limits, and optimistic likes. |

### Utility & Long-Form Routes

| Route | Description |
| --- | --- |
| `/notes/:collection/:slug` | Deep-dive MDX entry reader for `/content/principles`, `/content/bug-stories`, `/content/shelf-items`, and `/content/commits`, with generated outline ToC and `PageShell` metadata. |
| `/privacy` | Plain-language summary detailing zero behavioral tracking, self-hosted fonts, client error scrubbing, and exact `localStorage` keys. |
| `/admin` | Password-protected moderation dashboard for `/wall` submissions (approve, reject, status filter, and CSV/JSON export). |
| `*` (`/404`) | Exit code `404` fallback route with a random principle picker and navigation back to `/`. |

---

## Core Architecture & Features

### Editorial Shell & Navigation
- **Priority+ Header ([`Header.tsx`](src/components/Header.tsx))**: Dynamically measures viewport width and moves overflowing sub-route links cleanly while keeping `EDITORIAL | RAW .MD`, `Field Index [+]`, and primary controls reachable without horizontal overflow.
- **`PageShell` ([`PageShell.tsx`](src/components/PageShell.tsx))**: Shared wrapper for every non-home route providing interactive `~/working_copy.md / <route>` breadcrumbs, hide-on-scroll-down / show-on-scroll-up header behavior, a `2px` accent reading-progress hairline, mono route index (`02 / play`), serif intro block, Field-Index-ordered Prev/Next footer cards with hover previews, and per-route `document.title` / Meta / Open Graph updates.
- **`Field Index` ([`IndexOverlay.tsx`](src/components/IndexOverlay.tsx))**: Full-screen route and `#read` section directory animating from the trigger button's coordinates via a CSS `clip-path` circle transition.
- **Route Transitions ([`RouteTransitionCurtain.tsx`](src/components/RouteTransitionCurtain.tsx))**: Fullscreen curtain transition with a `>_` destination label and `aria-live="polite"` route announcer.
- **Preloader & Route Skeletons ([`Preloader.tsx`](src/components/Preloader.tsx), [`RouteSkeletons.tsx`](src/components/RouteSkeletons.tsx))**: Initial asset-aware counter overlay (`000 -> 100%`) plus dedicated loading skeletons for lazy-loaded routes.

### Typography, Themes, Reading Mode & Custom Cursor
- **Design Tokens ([`src/styles/tokens.css`](src/styles/tokens.css))**:
  - **Self-hosted Latin WOFF2 fonts** (`Instrument Serif`, `Newsreader`, `JetBrains Mono`) preloaded cleanly with metric-adjusted system font fallbacks.
  - **Three WCAG-verified palettes** (`Night` `#201e1f`, `Paper` `#faf7f2`, `Sepia` `#f2e7d3`) respecting `prefers-color-scheme` by default, plus terminal-switchable accent hues (`accentTheme.ts`). All text and accent tokens meet or exceed `4.74:1` contrast.
  - **Fluid type scale & layout caps**: Built with `clamp()`, `--measure: 62ch`, and `--container-max: 90rem` (~1440px) centered so ultrawide monitors (`1920px`–`2560px`) never over-stretch prose.
- **Distraction-Free Reading Mode ([`ReadingModeBar.tsx`](src/components/ReadingModeBar.tsx))**: Toggles global chrome visibility, switches themes (`Night` / `Paper` / `Sepia`), adjusts body scale (`sm`, `md`, `lg`, `xl`), widens line-height, and persists preferences in `localStorage`.
- **Magnetic Custom Cursor ([`CustomCursor.tsx`](src/components/CustomCursor.tsx))**: Hidden until the first real `pointermove` and disabled automatically on touch / `pointer: coarse` devices and `prefers-reduced-motion: reduce`. Expands over interactive controls, pulls magnetically toward header/Field Index buttons, shrinks on press, and displays contextual labels (such as `read` over `#read`).

### Keyboard Shortcuts ([`ShortcutsModal.tsx`](src/components/ShortcutsModal.tsx))

| Context | Shortcut | Action |
| --- | --- | --- |
| Global | `Cmd / Ctrl + K` | Open Command Palette ([`CommandPalette.tsx`](src/components/CommandPalette.tsx)) |
| Global | `/` | Focus site-wide search |
| Global | `?` | Open/close keyboard shortcuts modal |
| Global | `Esc` | Close active overlay, modal, or drawer |
| Interactive routes | `←` / `→` | Step through `/bug-museum`, `/shelf`, or `/delete` slider |
| `/delete` slider | `Home` / `End` | Snap comparison slider to `0%` or `100%` |
| `/terminal` | `↑` / `↓`, `Tab`, `Ctrl+L`, `Ctrl+C` | History, autocomplete, clear screen, or interrupt output |

---

## Content Authoring & Customization

### Site Metadata (`src/site.config.ts`)
Core author, contact, titleplate, date, and subtitle copy live in [`src/site.config.ts`](src/site.config.ts) (re-exported from [`site.config.ts`](site.config.ts) at the repository root) alongside [`src/content/manifesto.md`](src/content/manifesto.md). Updating `SITE_CONFIG` automatically propagates to the Hero plate, `PageShell` breadcrumbs, Footer sign-off, SEO tags, and `Raw .md` serialization.

### MDX Content Collections (`/content`)
[`vite-content-plugin.ts`](vite-content-plugin.ts) scans `/content`, validates frontmatter against Zod schemas in [`src/lib/contentSchema.ts`](src/lib/contentSchema.ts) (failing the build with file + field diagnostics if invalid), compiles outline headings/blocks, and serves them via `virtual:content/*`:

- `content/principles/` — `11` long-form principle essays (`number`, `title`, `slug`, `date`, `tags`, `summary`, `draft`)
- `content/bug-stories/` — `8` postmortem exhibits (`exhibitNumber`, `year`, `category`, `cause`, `cost`, `lesson`, `snippet`)
- `content/commits/` — `10` git-style manifesto commits (`prefix`, `hunk`, `blame`)
- `content/shelf-items/` — `14` items (`10` books with spine dimensions/hex colors + `4` workbench tools)

Scaffold a new entry cleanly with:

```bash
npm run new
# Or non-interactively:
npm run new -- --type principle --title "Write smaller diffs"
```

---

## Backend API & Database (`/api` + Supabase)

Serverless API routes in [`api/`](api/) use native Node ESM imports (explicit `.js` relative paths for `"type": "module"` compatibility on Vercel) and zero external runtime SDKs—communicating directly with Supabase's PostgREST/RPC APIs via [`api/_lib/wallStore.ts`](api/_lib/wallStore.ts).

| Endpoint | File | Purpose |
| --- | --- | --- |
| `GET /api/health` | [`api/health.ts`](api/health.ts) | Reports service status and live Supabase connectivity (`"db": "connected"` / `"not-configured"` / `"error"`). |
| `GET / POST /api/wall` | [`api/wall.ts`](api/wall.ts) | Serves approved public Wall principles (edge-cached) and accepts sanitized submissions guarded by honeypot trap, minimum submit-time check (`>= 3s`), burst limit (`1/min`), and hourly sliding limit (`3/hr`). |
| `POST /api/wall/like` | [`api/wall/like.ts`](api/wall/like.ts) | Validates UUIDs, enforces per-IP hourly like rate limits, and atomically increments `likes` via the `increment_wall_like(uuid)` Postgres function. |
| `GET / PATCH /api/admin/submissions` | [`api/admin/submissions.ts`](api/admin/submissions.ts) | Bearer-token protected moderation queue (`ADMIN_PASSWORD`, constant-time SHA-256 comparison, 5 failed auth attempts per 15 min cap). |
| `GET /api/admin/export` | [`api/admin/export.ts`](api/admin/export.ts) | Authenticated JSON or formula-injection-safe CSV export of all Wall submissions (zero PII). |
| `POST /api/report-error` | [`api/report-error.ts`](api/report-error.ts) | Cookie-free client error collector that scrubs emails/Bearer tokens and optionally forwards alerts to `ALERT_WEBHOOK_URL`. |

### Database Schema ([`supabase/wall_schema.sql`](supabase/wall_schema.sql))
Creates:
- `public.wall_submissions` (`id`, `principle`, `author`, `country_flag`, `author_url`, `status`, `likes`, `created_at`) with Row-Level Security allowing public reads only for `status = 'approved'`.
- `public.wall_rate_limits` (`id`, `ip_hash`, `action`, `created_at`) with RLS enabled and zero public policies (server-only via `SUPABASE_SERVICE_ROLE_KEY`); stores salted SHA-256 hashes of IPs and prunes records older than 24 hours.
- `public.increment_wall_like(uuid)` PL/pgSQL RPC function for atomic like updates.

---

## Responsive Design, Performance & PWA

- **Responsive Breakpoints & Mobile Patterns**: Uses mobile-first CSS across 9 breakpoint tokens (`360px` to `2560px`), dynamic viewport units (`dvh`/`svh`/`lvh`), `env(safe-area-inset-*)` with `viewport-fit=cover`, container queries (`cards`, `terminal`, `sliders`), `@media (hover: hover)` hover gating, `>= 44x44px` minimum touch targets (`8px` minimum gap), reduced landscape-phone heights, `200%` zoom resilience, and automatic animation pausing on low-power/battery-saver modes (`src/lib/lowPower.ts`) and `prefers-reduced-motion: reduce`.
- **Bundle Code Splitting ([`vite.config.ts`](vite.config.ts))**: Separates `vendor-react`, lazy `vendor-motion` (`framer-motion`), and lazy `vendor-shiki` (`shiki`), verified after every build by [`scripts/check-bundle-budget.mjs`](scripts/check-bundle-budget.mjs):
  - Initial entry JS (gzip): `<= 85 kB` (with `0` lazy-only vendors leaked into initial load)
  - Initial CSS (gzip): `<= 14 kB`
  - Critical preloaded WOFF2 fonts: `<= 50 kB`
  - Total initial critical payload: `<= 150 kB`
  - Largest non-Shiki/Delete lazy route chunk (gzip): `<= 75 kB`
  - Lazy Shiki vendor chunk (gzip): `<= 115 kB`
- **PWA & Offline Support ([`public/sw.js`](public/sw.js), [`public/manifest.webmanifest`](public/manifest.webmanifest))**: Cache-first static assets/fonts/icons, network-first document/API requests with [`public/offline.html`](public/offline.html) fallback, and an interactive update prompt ([`PwaUpdateToast.tsx`](src/components/PwaUpdateToast.tsx)).

---

## Project Structure

```text
manifesto/
├── .github/
│   ├── dependabot.yml                 # Weekly grouped npm & GitHub Actions dependency updates
│   └── workflows/
│       ├── ci.yml                     # Lint, typecheck, unit tests, build/budget, Playwright E2E×4, vitals
│       ├── preview.yml                # Optional PR Vercel preview deploy + Lighthouse CI PR comment
│       ├── deploy-production.yml      # Runs CI on main (and optional Vercel --prod CLI deploy + smoke test)
│       ├── daily-backup.yml           # Scheduled daily gzipped + SHA-256 Wall database backup artifact
│       └── uptime-monitor.yml         # 15-minute live site, security header, and /api/health monitor
├── api/
│   ├── _lib/wallStore.ts              # Env config, IP hashing, rate limiter, input/URL sanitization, CSV escaping
│   ├── admin/{submissions,export}.ts  # Authenticated moderation queue & CSV/JSON export
│   ├── wall/like.ts                   # Rate-limited like RPC endpoint
│   ├── health.ts                      # Live DB + serverless health endpoint
│   ├── report-error.ts                # Scrubbed client error collector
│   └── wall.ts                        # Public GET/POST Wall submissions handler
├── content/
│   ├── bug-stories/                   # 8 MDX postmortem exhibits
│   ├── commits/                       # 10 MDX git-commit manifesto entries
│   ├── principles/                    # 11 MDX principle essays
│   └── shelf-items/                   # 14 MDX books & workbench tools
├── e2e/
│   ├── a11y.ts                        # Shared axe-core assertion helpers
│   ├── responsive.spec.ts             # 9-device layout, overflow, touch-target, focus-order & visual snapshots
│   └── site.spec.ts                   # Core navigation, terminal, Wall mocks, themes, Reading Mode & PWA E2E
├── public/
│   ├── fonts/                         # Self-hosted Latin WOFF2 files (Instrument Serif, Newsreader, JetBrains Mono)
│   ├── icons/                         # PWA 192px/512px standard & maskable PNG icons
│   ├── manifest.webmanifest           # Web App Manifest
│   ├── offline.html / offline.js      # Offline fallback document
│   ├── og-image.png / favicon.svg     # Social preview & vector favicon
│   ├── robots.txt / sitemap.xml       # Crawler directives & XML sitemap
│   └── sw.js                          # Service worker
├── scripts/
│   ├── backup-wall-db.mjs             # Automated gzip + SHA-256 Supabase backup script
│   ├── check-bundle-budget.mjs        # Strict gzipped payload & lazy-vendor isolation verifier
│   ├── generate-pwa-icons.mjs         # Generates PWA icon sizes & apple-touch-icon
│   ├── measure-vitals.mjs             # Headless Chromium Slow-4G/4x-CPU LCP, CLS & INP verifier
│   ├── new-content.mjs                # CLI generator for new MDX entries in /content
│   ├── optimize-assets.mjs            # Encodes WebP/JPEG photography & 1200×630 OG image
│   ├── sync-fonts.mjs                 # Copies subsetted WOFF2 files from @fontsource packages
│   └── verify-pwa.mjs                 # Validates manifest, icons, SW registration & offline assets
├── src/
│   ├── components/                    # Hero, PageShell, Header, IndexOverlay, RawMarkdownView, sub-pages & modals
│   ├── content/manifesto.md           # Home manifesto Markdown metadata
│   ├── data/                          # Structured datasets for principles, naming game, delete comparisons & bugs
│   ├── lib/                           # Router, routes config, Zod content schemas, PageShell meta, audio, cursor, PWA
│   ├── styles/                        # Design tokens, self-hosted @font-face declarations, responsive & global CSS
│   ├── test/                          # 19 Vitest unit & component test suites
│   ├── App.tsx                        # Top-level state, lazy route loading, view transitions & global modals
│   ├── routes.ts                      # Re-exports src/lib/routes.ts
│   └── site.config.ts                 # Author, contact & manifesto identity configuration
├── supabase/
│   └── wall_schema.sql                # PostgreSQL tables, indexes, RLS policies & like increment RPC
├── index.html                         # SEO, Open Graph, Twitter Card & font preload tags
├── lighthouserc.json                  # Mobile Lighthouse CI assertions & budgets
├── netlify.toml                       # Static Netlify build, SPA redirects & security headers
├── playwright.config.ts               # Cross-engine (4) + responsive device/viewport (9) Playwright projects
├── site.config.ts                     # Root re-export of src/site.config.ts
├── tsconfig.{json,app.json,node.json} # Strict TypeScript project references
├── vercel.json                        # Vercel build config, security/cache headers & /api exclusion rewrite
└── vite-content-plugin.ts             # Custom Vite plugin compiling & validating /content MDX modules
```

---

## Getting Started

### Prerequisites

- **Node.js `26`** (see [`.nvmrc`](.nvmrc)) and **npm `10+`**
- Optional: **PostgreSQL CLI (`psql`)** and a **Supabase** project if running `/wall` and `/admin` endpoints

### Local Setup

```bash
git clone https://github.com/donwolfonline/MANIFESTO.git
cd MANIFESTO
npm install
```

Copy `.env.example` to `.env` (gitignored) if connecting `/api` routes or backup scripts to Supabase:

```bash
cp .env.example .env
```

Apply the database schema to your Supabase Postgres database (idempotent):

```bash
psql "$POSTGRES_URL_NON_POOLING" -v ON_ERROR_STOP=1 -f supabase/wall_schema.sql
```

Start the Vite development server:

```bash
npm run dev
# Or bind a custom port:
npm run dev -- --port 3001
```

> **Note:** `npm run dev` serves the frontend SPA. To execute `/api/*` serverless routes locally against `.env`, use `vercel dev`.

---

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server with HMR. |
| `npm run build` | Run strict TypeScript project build (`tsc -b`) and bundle `dist/`. |
| `npm run preview` | Preview the built production `dist/` directory locally. |
| `npm run typecheck` | Type-check browser app, serverless `api/`, tests, and build configs (`tsc -b`). |
| `npm run lint` / `npm run lint:fix` | Run ESLint with `--max-warnings=0` (or auto-fix). |
| `npm run analyze` | Build with `rollup-plugin-visualizer` treemap at `dist/bundle-stats.html`. |
| `npm run budget` | Enforce gzipped payload limits and lazy-vendor isolation against `dist/`. |
| `npm run perf:measure` / `npm run perf:check` | Build and measure throttled mobile Chromium Web Vitals (`LCP <= 2000ms`, `CLS <= 0.05`, `INP <= 200ms`). |
| `npm run test` / `npm run test:unit` / `npm run test:watch` | Run Vitest unit & component tests (19 suites). |
| `npm run test:e2e` | Build and run the full Playwright E2E + `axe-core` suite. |
| `npm run test:e2e:responsive` | Build and run `e2e/responsive.spec.ts` across all 9 viewport/device projects. |
| `npm run test:e2e:snapshots` | Build and update baseline Playwright responsive visual screenshots. |
| `npm run test:e2e:install` | Install Chromium, Firefox, and WebKit Playwright browsers. |
| `npm run test:all` | Full pre-PR verification sequence: `lint -> typecheck -> test:unit -> build -> budget -> playwright test`. |
| `npm run lhci` | Build and run 3 mobile Lighthouse CI passes against `/`, `/wall`, and `/privacy`. |
| `npm run new` | Scaffold a new frontmatter-validated MDX entry inside `/content`. |
| `npm run db:backup` | Export `wall_submissions` from Supabase as a verified `.json.gz` + `.sha256` snapshot. |
| `npm run fonts:sync` | Sync subsetted WOFF2 fonts from `@fontsource` into `public/fonts/`. |
| `npm run optimize-assets` | Generate `human-job.webp`, optimized progressive `.jpg`, and `1200x630` `public/og-image.png`. |
| `npm run pwa:icons` / `npm run pwa:check` | Regenerate PWA PNG icons or verify manifest, icons, and service worker assets. |

---

## Testing & Quality Gates

- **Unit & Integration (`Vitest`)**: 19 test files covering security sanitizers (`wallSecurity`), form validation (`wallValidation`), route typing/sitemap generation (`routes`), `PageShell` metadata & prev/next links, hero choreography, `EDITORIAL | RAW .MD` mode, custom cursor, terminal CLI commands, naming game evaluator, focus room timer, PWA fetch classification, and responsive utilities.
- **Cross-Browser E2E & Accessibility (`Playwright` + `@axe-core/playwright`)**: Runs against the production preview build across `chromium`, `firefox`, `webkit`, and `mobile-chrome` (`Pixel 5`), verifying zero console/page errors, `axe-core` accessibility compliance, Night/Paper/Sepia contrast in Reading Mode, keyboard shortcuts, mocked `/wall` submissions, and offline PWA behavior.
- **9-Device Responsive Matrix (`e2e/responsive.spec.ts`)**: Verifies zero horizontal overflow, header non-overlap, Field Index open/close behavior, `>= 44x44px` tap targets, logical focus order, `prefers-reduced-motion`, and visual regression baselines across:
  - `iphone-se` (`375x667`), `iphone-15` (`393x852`), `pixel-7`, `galaxy-fold-unfolded`, `ipad-mini`, `ipad-pro-landscape`, `laptop-1366x768`, `desktop-1920x1080`, `desktop-2560x1440`.
- **Lighthouse CI (`lighthouserc.json`)**: Asserts mobile `performance >= 0.90`, `accessibility >= 0.95`, `best-practices >= 0.90`, `LCP <= 2800ms`, `CLS <= 0.05` (errors), plus `seo >= 0.90` and `TBT <= 200ms` (warnings).

---

## Environment Variables & Deployment

### Environment Variables

All database and moderation credentials are **server-side only** (never prefixed with `VITE_`):

| Variable | Required for | Description |
| --- | --- | --- |
| `SUPABASE_URL` | `/api/*`, `db:backup` | Supabase project REST base URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `/api/*`, `db:backup` | Supabase service-role key (server-side only) |
| `ADMIN_PASSWORD` | `/admin`, `/api/admin/*` | Passphrase authenticating moderation & CSV/JSON exports |
| `RATE_LIMIT_SALT` | `/api/wall`, `/api/wall/like`, `/api/report-error` | Random `32+` character salt for hashing visitor IPs |
| `ALERT_WEBHOOK_URL` | `/api/report-error` *(optional)* | HTTPS Slack/Discord/ntfy webhook for scrubbed error alerts |
| `VITE_GLITCHTIP_DSN` | Client monitoring *(optional)* | Optional Sentry/GlitchTip DSN if overriding `/api/report-error` |

### Vercel & GitHub Actions CI/CD

1. **Vercel Production Auto-Deployments ([`vercel.json`](vercel.json))**:
   - Pushing to `main` triggers Vercel's native Git integration (`npm run build` -> `dist/`, serverless functions from `/api`, strict CSP/HSTS/cache headers, and `/((?!api/).*)` SPA fallback).
   - Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, and `RATE_LIMIT_SALT` in **Vercel Project Settings -> Environment Variables**.
2. **GitHub Actions Workflows (`.github/workflows/`)**:
   - [`ci.yml`](.github/workflows/ci.yml): Runs `quality` (ESLint, `tsc -b`, Vitest), `build` (`vite build` + bundle budget), and parallel `e2e` across Chromium/Firefox/WebKit/Mobile Chrome + throttled Core Web Vitals checks (`CI passed`).
   - [`deploy-production.yml`](.github/workflows/deploy-production.yml): Runs `ci.yml` on `main`; if `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` repository secrets are configured, it also deploys via Vercel CLI and smoke-tests `/` headers + `/api/health`.
   - [`preview.yml`](.github/workflows/preview.yml): Optional PR preview deployment + Lighthouse CI PR report when `VERCEL_*` secrets are present (plus optional `VERCEL_AUTOMATION_BYPASS_SECRET` if preview protection is enabled).
   - [`daily-backup.yml`](.github/workflows/daily-backup.yml): Runs daily at `03:15 UTC` using GitHub Secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, uploading verified gzip + SHA-256 backups for 30 days.
   - [`uptime-monitor.yml`](.github/workflows/uptime-monitor.yml): Runs every 15 minutes against repository variable `SITE_URL` (`https://manifestomd.vercel.app`), verifying `200 OK`, title marker, security headers, and `/api/health` (`{"ok":true}`) with optional `UPTIME_ALERT_WEBHOOK_URL` alerting and automated issue tracking.
   - `.github/dependabot.yml`: Weekly Monday (`06:00 UTC`) grouped updates for npm and GitHub Actions.

---

## License

Personal project — customize and adapt freely.
