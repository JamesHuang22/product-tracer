# Product Tracer — Development Queue

> All task state lives here. Coder agents read this file to find work, write to it to report progress.
> Lock mechanism: both coders compete for `ready` tasks. First to set `Locked by` wins.
> See `doc/AUTOMATION_SYSTEM.md` for full architecture.

---

## [2026-06-28] TASK-001: Fix locale-prefixed routes for /trends, /youtube-insights, /bookmarks
- **Priority**: P2
- **Status**: ready
- **Locked by**:
- **Locked at**:
- **Acceptance**: `/en/trends`, `/zh/trends`, `/en/youtube-insights`, `/zh/youtube-insights`, `/en/bookmarks`, `/zh/bookmarks` all return 200 with correct locale content
- **Spec**:
  Currently the site uses cookie-based i18n with no `[locale]` route segment. Visiting `/en/trends` or `/zh/trends` returns 404. We need to add Next.js App Router `[locale]` dynamic segments for the three pages AND the `/` root page (as a landing), keeping backward compatibility with `/trends`, `/youtube-insights`, `/bookmarks`.

  **Implementation plan (`apps/web/app/`):**

  1. **Add catch-all or middleware redirect for legacy paths** so existing links (`/trends` → `/en/trends` or `/zh/trends` based on cookie) don't break. Option A: middleware that reads the locale cookie and 308-redirects `/trends` → `/{locale}/trends` (and similar for `/youtube-insights`, `/bookmarks`, `/`). Option B: keep both the old flat route and the new `[locale]` route. Choose based on simplicity.

  2. **Create `[locale]` route group:**
     - `app/[locale]/page.tsx` — re-export or re-implement the homepage (`app/page.tsx`). Read `params.locale`, pass it to `I18nProvider` (override the cookie as `initialLocale`).
     - `app/[locale]/trends/page.tsx` — same pattern for `/trends/page.tsx`.
     - `app/[locale]/youtube-insights/page.tsx` — same pattern.
     - `app/[locale]/bookmarks/page.tsx` — same pattern.

  3. **Layout chain considerations:**
     - The `app/layout.tsx` root layout reads the locale cookie for `I18nProvider.initialLocale`. For `[locale]` routes, the `[locale]` layout (or a shared layout within the group) should override `I18nProvider`'s initial locale with the route param instead of the cookie, so `/zh/trends` always renders Chinese regardless of the user's cookie.
     - Keep `app/layout.tsx` as the root wrapper (fonts, theme, header). Add `app/[locale]/layout.tsx` that re-wraps with locale from params.

  4. **Middleware for redirect (Option A):**
     - In `middleware.ts`, before the Supabase session refresh: if the request path is `/trends`, `/youtube-insights`, `/bookmarks`, or `/` and doesn't already start with a locale prefix, read the `locale` cookie and 308-redirect to `/{locale}{path}`. If no cookie is set, default to `en` (or sniff `Accept-Language`).

  5. **SEO / metadata:**
     - `alternates` in root metadata will need locale-specific `canonical` / `hrefLang` entries once the locale routes exist:
       `<link rel="alternate" hrefLang="en" href="https://product-tracer.vercel.app/en/trends" />` etc.

  6. **Backward compatibility:**
     - All external RSS feeds (`/feed/projects.xml`, `/feed/youtube-insights.xml`) and API routes (`/api/*`) must NOT be locale-prefixed — they should be excluded from any middleware redirect.
     - `matcher` in `middleware.ts` must exclude `_next/*`, `favicon.ico`, `og/*`, static files, `api/*`, `feed/*`, and `auth/*`.

  7. **X (Twitter) collector note:** There is an `apps/worker/src/collectors/x.ts` / `collect-x.ts` — unrelated to locale routing.

  **Files to touch:**
  - `apps/web/middleware.ts` — add locale-based 308 redirect for legacy paths
  - `apps/web/app/[locale]/layout.tsx` — new, reads params.locale, wraps I18nProvider
  - `apps/web/app/[locale]/page.tsx` — new, re-exports homepage
  - `apps/web/app/[locale]/trends/page.tsx` — new
  - `apps/web/app/[locale]/youtube-insights/page.tsx` — new
  - `apps/web/app/[locale]/bookmarks/page.tsx` — new
  - Possibly: existing page.tsx files for `/trends`, `/youtube-insights`, `/bookmarks` can become thin re-exports or be removed (avoiding dead code)

  **Validation:**
  - `pnpm typecheck` must pass
  - `curl -sI https://product-tracer.vercel.app/en/trends` → 200, body contains correct locale (check for Chinese on `/zh/trends`)
  - Legacy `/trends` → 308 → `/en/trends` (or `/zh/trends` if cookie was set)
  - `/` → 308 → `/en/` or `/zh/` (keeps homepage working from all entry points)
  - RSS `/feed/projects.xml` → 200 (not redirected)

---

## [2026-06-28] TASK-002: GitHub collector — richer data, freshness filter
- **Priority**: P1
- **Status**: ready
- **Locked by**:
- **Locked at**:
- **Acceptance**: GitHub collector fetches more fields (description, stars, language, topics) and skips repos older than 30 days
- **Spec**:
  The GitHub collector already stores most of these fields (description as `one_liner`, stars via `app.project_metric.github_stars`, language as `category`, topics as `topics[]`). The real gaps are:
  - **Description** (`one_liner`) is stored but only from the `description` field — it's already being written.
  - **Stars** are tracked in `app.project_metric` via `github_stars` — already done.
  - **Language** is stored as `category` — already done.
  - **Topics** are stored in `app.project.topics` — already done via migration 0016.

  **What actually needs to happen:**

  1. **Review existing code**: `apps/worker/src/collectors/github.ts` already has `GithubRepo` with all these fields. `apps/worker/src/scripts/collect-github.ts` already stores `repo.description` (as `one_liner`), `repo.language` (as `category`), `repo.topics`, and creates `project_metric` entries for `github_stars`. **The acceptance criteria are already met for storing these fields.** Update the queue acceptance to reflect reality, or identify what's actually missing.

  2. **Freshness filter — tighten from 6 months to 30 days:**
     - In `apps/worker/src/collectors/github.ts`, the `isStaleRepo()` function currently drops repos with no push in 6 months (unless >1000 stars). Per the acceptance criteria, change this to **30 days** for repos with ≤100 stars (moderate filter) and keep 6 months for repos >1000 stars.
     - Update: `const SIX_MONTHS_MS` should become `const STALE_DAYS = 30;` for the default case, or better: make it 30 days for repos ≤100 stars, 90 days for 100-1000 stars, and keep 180 days for >1000 stars (tiered freshness by star count).

  3. **Add `description` (full text) storage explicitly:**
     - Currently `one_liner` stores `repo.description` (VARCHAR limited). If `repo.description` can exceed VARCHAR length, add a dedicated TEXT column `app.project.description` or ensure the upsert handles truncation. Check current `app.project.one_liner` column type — if it's `text` or has sufficient length, no migration needed.

  4. **Ensure all fields appear in discovery output:**
     - `defaultDiscoveryQueries()` uses sort: stars for some queries. Verify that queries like `topic:indie` and `topic:side-project` return useful results (topics are user-applied metadata on GitHub).

  **Files to touch:**
  - `apps/worker/src/collectors/github.ts` — tighten freshness filter
  - `apps/worker/src/scripts/collect-github.ts` — verify all fields are written (may need no changes)
  - Possibly: migration file for a `description` column if `one_liner` is too short

  **Validation:**
  - `pnpm collect:github` runs without error
  - Newly collected repos have populated `topics`, `language`, `description` in the DB
  - Very stale repos (>30 days with no push) are filtered out on discovery
  - Existing known repos with >1000 stars preserved even if stale

---

## [2026-06-28] TASK-003: Re-enable all collectors + verify post-unblock
- **Priority**: HIGH
- **Status**: ready
- **Locked by**:
- **Locked at**:
- **Acceptance**: All 5 core collectors (GitHub, HN, PH, Reddit, YouTube) run successfully. Any non-billing failures reported.
- **Spec**:
  **Background:** GitHub Actions billing is blocked (payments failed / spending limit exhausted). All scheduled and dispatch workflows cannot start. See `doc/bug-reports.md` and `RESPONSE.md` (Phase 2 Sprint section). This is NOT a code problem — it's a **GitHub billing / account issue**.

  **Note:** There are actually **6 collectors** (GitHub, HN, PH, Reddit, X, YouTube), not 5. The acceptance criteria says "5" — verify which one is excluded (X? It runs every 6h and requires auth token) or include all 6.

  **Implementation plan (code side):**

  1. **Confirm billing status:** Check if billing has been resolved since the queue was written. If still blocked, two options:
     - **Option A (recommended):** Switch collector execution to local machine via `crontab` or `launchd`. Create a script that runs all collectors sequentially, registered as a local cron:
       ```
       0 */2 * * * cd /Users/jameshuang/Desktop/ai_project/product-tracer && pnpm collect:github >> /tmp/collect-github.log 2>&1
       30 */4 * * * ...collect:hackernews...
       ```
       Use `openclaw cron` or system `launchd` as the runner.
     - **Option B:** Run collectors on a cheap VPS / Railway / Fly.io with cron + DATABASE_URL env.

  2. **Create local runner script:** `apps/worker/src/scripts/run-all-collectors.ts` — sequential execution of all collectors with staggered timing, logging, and error reporting (post to `raw.collector_error` on failure).

  3. **Add local cron registration:** Update `doc/AUTOMATION_SYSTEM.md` with instructions and register via `openclaw cron add` or `crontab -e`.

  4. **For each collector, verify run success by checking `raw.snapshot` for new rows after execution.**

  5. **Non-billing failures** (e.g., API key expired, quota exceeded, schema mismatch) should be caught individually per collector:
     - **HN:** Public API, no auth — fails only if HN is down
     - **Reddit:** RSS fallback exists (old.reddit.com + UA rotation) — verify both JSON and RSS paths
     - **PH:** Requires PH API token — check if `PRODUCTHUNT_TOKEN` is set locally; document what env vars are needed
     - **YouTube:** Requires API key or OAuth — check if `YOUTUBE_API_KEY` is set locally
     - **X:** Requires X API credentials — these may be the hardest; consider documenting that X collector will fail without valid creds

  **Files to touch:**
  - `apps/worker/src/scripts/run-all-collectors.ts` — new: orchestrator that runs all 6 collectors, logs results
  - `doc/AUTOMATION_SYSTEM.md` — add local runner instructions
  - `apps/worker/.env.example` or equivalent — document required env vars for each collector

  **Validation:**
  - Run `pnpm exec tsx src/scripts/run-all-collectors.ts` locally
  - Each collector outputs `✓` / error message
  - `raw.snapshot` shows new rows for each platform
  - Any API credential gaps documented clearly
  - Billing status noted: if still blocked, this is a **human action blocker** — tasks should be documented and handed off

---

## Done Tasks

## [2026-06-27] TASK-000: User Auth + Synced Bookmarks
- **Priority**: P0
- **Status**: done
- **PR**: #77
- **Verify**: PASS — all pages 200, auth flow works
