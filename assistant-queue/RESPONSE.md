# Coder-Auto session — Response (2026-06-28)

## TASK-007 — Weekly trends repeated across weeks (P0 BUG) ✅ code fixed & merged (PR #85)

**Root cause (confirmed in DB):** the pipeline gathered its corpus with a trailing `now() - 7 days` window but keyed each row to the ISO week. With bursty/stalled collection, every run captured ~the same recent rows, so weeks 2026-06-15 and 2026-06-22 stored **identical top products** ("Are You in the Weights? | Elvin | Dropmatico | …") and near-duplicate themes. Those stored products didn't even match 06-22's real signal leaderboard.

**Fix (`apps/worker/src/scripts/weekly-trend.ts`):** corpus bounded to the exact ISO week `[week_start, week_end)`; upsert keyed to that week; new `--week=YYYY-MM-DD` arg to regenerate any historical week from its own data; LLM prompt scoped to the week with an explicit "don't carry over previous weeks" instruction. Typechecks; verified at the data layer that bounded weeks differ.

**⚠️ Not yet visible on /trends — handed off as TASK-008.** Per your decision (*merge code; regen later*), the already-stored rows stay as-is until the pipeline reruns:
```
pnpm --filter @product-tracer/worker run:weekly-trend --week=2026-06-15
pnpm --filter @product-tracer/worker run:weekly-trend --week=2026-06-22
```
This needs `LLM_API_KEY` (DeepSeek) and DB access — I have neither locally, and the cron is billing-blocked (TASK-003). **Deeper data issue:** all 137 signals currently sit in week 06-22 (collectors stalled), so once regenerated, earlier weeks (e.g. 06-15) will legitimately have **empty** signal-based top products until collection resumes.


## TASK-005 — Marketing landing page (P0) ✅ shipped & verified (PR #84)

New animated landing at `/`; the former homepage dashboard moved to **`/dashboard`**.

**Per your two choices:** built the **animated gradient-mesh** hero (CSS `@keyframes` drifting/hue-shifting blobs + floating dots, reduced-motion aware) — *not* a heavy particle lib — and **moved the dashboard to `/dashboard`**. Scroll fade-ins use a ~1kb IntersectionObserver `<Reveal>` instead of framer-motion, so `/` First Load JS is ~116 kB.

**Includes:** Get Started CTA (`data-cta="landing-get-started"`, → `/login` or `/dashboard` if signed in), 3 feature cards, a live stats strip (real product + AI-summary counts), footer; fully bilingual (EN/ZH). Signed-in visitors hitting `/` are redirected to `/dashboard`; post-auth redirects now go to `/dashboard` (was `/bookmarks`); header gains a Dashboard link.

**Verified in prod:** `/`, `/dashboard`, `/en`, `/zh`, `/en/dashboard`, `/zh/dashboard` all 200; EN + ZH landing render correctly (`<html lang>` + translated strings); dashboard shows the overview with no landing leak.


## TASK-004 — Brand rename → OpenProduct (P0) ✅ shipped & verified (PR #83)

Renamed the user-facing brand **"Product Tracer" → "OpenProduct"** across the live product: every page title/metadata, OG + Twitter tags, the OG image wordmark, RSS feed titles, the site-header brand, and the README + db README.

**Preserved (deliberately):** the `@product-tracer/*` package names, the `product-tracer.vercel.app` deployment domain, DB/table/column names, and API routes — renaming these would break the build/deploy and contradict the spec. The lowercase phrase "an intelligent product tracer" (the product *category* in the hero copy) is left as-is.

**Scope decision (please confirm if you want it wider):** I rebranded the **live frontend + front-door docs**. I did **not** rewrite point-in-time records — older CHANGELOG entries, `DECISIONS.md`, `HISTORY.md`, `PRD.md`, `status-*.md`, `doc/` guides, and `assistant-queue/*` still say "Product Tracer" where they describe past states. Rewriting historical records felt revisionist and risky; the live product is what users see. If you want a full sweep of every doc too, say so and I'll do a second pass.

**Verified in prod:** homepage + /projects + /trends + /youtube-insights + /bookmarks all show "OpenProduct", 0 "Product Tracer"; `<title>` rebranded; OG image route 200.


## TASK-006 — Empty YouTube insight cards (P0 BUG) ✅ shipped & verified (PR #82)

**Bug:** some cards on `/youtube-insights` showed only a sentiment dot + category + "Watch on YouTube", with no insight text.

**Root cause (confirmed in DB, not a guess):** of 117 `app.video_insight` rows, **20 store Chinese text in the English `key_insight` column**. The EN UI deliberately suppresses CJK (the no-Chinese-in-English rule via `localizedPair`), so those 20 rows resolved to empty text — and `DigestCard` rendered no paragraph at all (it also never showed the video title). 0 rows are empty in *both* languages, so this was purely the locale-suppression case, not null data.

**Fix (two layers):**
1. **DB guard** — added the "usable text in either language" predicate (already used by the homepage's `getTopVideoInsights`) to `getVideoInsights`, `getVideoInsightsByCategories`, the pager count, and the category counts — kept in sync so list/pager/badges agree. Drops 0 rows today; defensive against future null rows.
2. **Render fallback** — `DigestCard` now falls back to the **video title** when the localized insight is empty, then to a muted **"Analysis pending"**. A text block always renders. The EN no-CJK rule is preserved: the full Chinese insight body is still not shown in EN — only the title surfaces.

**Verified in prod:** EN renders 20 cards, all with content, no empty cards, no insight-body leak; ZH unchanged.

**⚠️ Upstream follow-up (worker, not done here):** the YouTube analysis pipeline is writing Chinese into the English `key_insight` column for ~17% of rows. The durable fix is in `apps/worker` — ensure `key_insight` is English and `key_insight_zh` holds the Chinese. This frontend fix makes the cards non-empty, but the data should be corrected at the source.

## TASK-001 — Locale-prefixed routes ✅ shipped & verified (PR #81)

`/en/*` and `/zh/*` URLs previously 404'd (locale was cookie-only). `middleware.ts` now strips the `/en`·`/zh` prefix, rewrites to the existing route, and sets the locale cookie on the forwarded request + response so the whole tree (header, body, `<html lang>`) is consistent. Verified: all six acceptance routes 200 with correct per-locale content; legacy routes + RSS feeds unaffected. **Note:** this reverses the earlier FE#1 decision ("locale-prefixed routes declined — 404 intentionally") — done per your explicit "merge it" call after the task had been removed from the queue mid-implementation.

---

# Email Confirmation Fix — Response (2026-06-28)

**Bug:** clicking the sign-up confirmation email showed **"unable to connect."**

**Root cause (two parts):**
1. **Supabase config (the actual cause):** the verify link redirects to the project's **Site URL**, which is still the default `http://localhost:3000`. On a real device that host is unreachable → "unable to connect." Our `emailRedirectTo` was also ignored because it wasn't on the redirect allow-list.
2. **Code:** `/auth/callback` only handled the PKCE `code` param, which can't be exchanged when the email is opened on a **different device** than the one used to sign up (the code-verifier cookie isn't there).

**Code fix — shipped & verified (PR #79):**
- New **`/auth/confirm`** route (`verifyOtp` with `token_hash`) — the Supabase-recommended SSR flow; device-independent.
- **`/auth/callback`** now handles both `code` (PKCE/OAuth) and `token_hash` fallback, so confirmation works whether or not the email template is updated.
- New friendly **`/auth/auth-code-error`** page instead of dead-end redirects.
- Login now detects **`email_not_confirmed`** and offers a **"resend confirmation email"** action; shows a localized "check your email" notice after sign-up. Server actions localize messages (EN/ZH).
- Verified in prod: `/auth/confirm` (no token) → 307 → `/auth/auth-code-error` (200); all key pages 200.

**Email verification is kept on** (`mailer_autoconfirm` is already `false`) per your requirement to validate real addresses.

## ⚠️ Required: 3 Supabase dashboard settings (you're applying these)

Project **ProductTracer** (`wpleklpvjmzfhfqukwzz`) → **Authentication**:

1. **URL Configuration → Site URL**
   ```
   https://product-tracer.vercel.app
   ```
2. **URL Configuration → Redirect URLs** → Add URL (add both):
   ```
   https://product-tracer.vercel.app/**
   http://localhost:3000/**
   ```
3. **Emails → Templates → "Confirm signup"** → change the link target to:
   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/bookmarks
   ```
   (i.e. replace the `href="{{ .ConfirmationURL }}"` with the URL above.)

After saving, sign up with a fresh email → the link opens
`/auth/confirm` → verifies → lands on `/bookmarks` signed in, on any device.
Existing unconfirmed accounts: use the new **Resend confirmation email**
button on the login page to get a working link.

---

# Accounts & Synced Bookmarks — Response (2026-06-27)

**Status: ✅ Shipped & verified in production (PR #77).** End-to-end user sign-up/login + account-synced bookmarks, leveraging Supabase Auth. Branch → PR → Vercel preview ✅ → squash-merge → migration via Supabase MCP → HTTP 200 verify.

## What shipped

| Area | Detail |
|------|--------|
| **Auth** | Email/password via `@supabase/ssr` (cookie sessions). `/login` (combined sign-in / create-account, one `authenticate` server action), `/account` (email · member-since · saved count · sign out), `/auth/callback` (email-confirmation/OAuth code exchange), session-refresh `middleware.ts`. |
| **Header** | Logged out → **Sign in** link; logged in → account menu (email · Account · Sign out). Mirrored in the mobile nav. |
| **Bookmarks** | Dual-mode behind a `BookmarksProvider`: guests keep localStorage; members get DB-backed bookmarks (`app.bookmark`, **migration 0017**) synced across devices. First login **merges** the guest's localStorage set into the account, then clears it. Optimistic toggles with server reconciliation. |
| **API** | `GET /api/bookmarks/ids`, `POST /api/bookmarks/toggle`, `POST /api/bookmarks/merge` (all auth-scoped, 401 when logged out). Existing `GET /api/bookmarks?slugs=` unchanged. |
| **i18n** | EN + ZH for `nav.signIn/account/signOut`, `auth.*`, `account.*`, `bookmarks.guestHint`. |

## Production verification (https://product-tracer.vercel.app)

- Pages 200: `/`, `/projects`, `/trends`, `/youtube-insights`, `/bookmarks`, `/login`.
- `/account` (logged out) → **307 → /login**; `/auth/callback` (no code) → **307 → /login**.
- `/api/bookmarks/ids` & `/toggle` (logged out) → **401**; `/api/bookmarks?slugs=` → **200**.
- `/login` renders the **live sign-in form** → the `NEXT_PUBLIC_SUPABASE_*` env vars are **already configured in Vercel**, so auth is live (no operator action needed).
- Supabase Auth (GoTrue) reachable with the configured key: `/auth/v1/settings` → 200; bogus login → `400 invalid_credentials` (correct).

## Architecture notes / decisions

- **Data path**: `app.bookmark` is accessed via the existing server-side postgres.js connection (consistent with `app`/`raw`, which aren't on PostgREST's exposed-schema allow-list), always scoped by the **session-verified** `user.id`. RLS (own-rows-only) is enabled as defense-in-depth. See `DECISIONS.md`.
- **Graceful degradation**: every auth path guards on `isSupabaseConfigured()`; without the public env vars, auth disables cleanly and bookmarks fall back to localStorage — `next build` and all routes stay green.

## ⚠️ Pre-existing security item (surfaced, not changed)

The Supabase advisor flags **`app.weekly_trend` has RLS disabled** — it's readable/writable by the anon role via PostgREST. It predates this work and is out of scope here. If you ever expose data via the Supabase JS client, enable RLS with a read-only policy:
```sql
alter table app.weekly_trend enable row level security;
create policy weekly_trend_read on app.weekly_trend for select using (true);
```
(The web app reads it via postgres.js, which is unaffected either way.)

---

# Phase 2 Sprint — Response (2026-06-24)

All 3 Phase 2 tasks shipped via branch → PR → squash-merge → HTTP 200 verify; `pnpm typecheck` (+ `next build` for frontend) before each PR; no direct pushes to main.

| # | Task | PR | Status |
|---|------|----|--------|
| 1 | Fix empty homepage insight card (P0 bug) | #68 | ✅ merged, verified (bad card `4y9DR2WwW3o` gone from EN home) |
| 2 | Historic weekly trends selector | #69 | ✅ merged, verified (`?week=2026-06-15` shows that week) |
| 3 | Collector quality + migration 0016 | #70 | ✅ code merged, migration applied; ⚠️ workflow run blocked by billing |

- **Task 1**: real cause was an insight whose `key_insight` column held Chinese → EN mode suppressed it (→null) but the card still rendered. Now skipped (no EN→Chinese fallback, per the CJK-suppression rule); query guard + page filter (buffer 8 → 3) + client-side null guard. Verified: the reported card is gone from the EN homepage; all 3 cards have text.
- **Task 2**: `getTrendWeeks()` + optional `weekStart` on the trend queries; `/trends?week=` validated against the real list, falls back to latest; WoW compares to the preceding week; selector hides with one week. Homepage unchanged. Verified all weeks 200 incl. a garbage param.
- **Task 3**: migration 0016 applied via Supabase MCP (7 columns confirmed). Collector stores the new fields, freshness-filters discovery (>6mo unpushed unless >1000★), bounded best-effort PR/commit enrichment (≤40/run, coalesced), schedule 4h→2h. Dedup name-pairs gated by same-category / Dice>0.8. Worker + web typecheck clean.

> ⚠️ **GitHub Actions blocked by billing.** The post-merge `collect-github` workflow run could **not start**: *"The job was not started because recent account payments have failed or your spending limit needs to be increased."* This is an account-level GitHub billing/spending-limit issue, **not** a code problem (typecheck + migration verified). It also blocks every other workflow (collectors, llm-classify, dedup, etc.). **Action: resolve GitHub billing / raise the Actions spending limit** in repo Settings → Billing. Note Task 3 raised the collector cadence to every 2h, which increases Actions usage once billing resumes.

---

# Day 2 Sprint — Response (2026-06-23)

> ⚠️ **PRODUCTION P0 — needs your action.** The site-wide HTTP 500s in `doc/bug-reports.md` (BUG-001…005) are **Supabase connection-pool exhaustion** (`EMAXCONNSESSION`, session pooler capped at 15 clients), not a schema/env break. I mitigated it (pool max 2→1 #62; transaction-pooler switch made opt-in after it hung #63/#64) and the site is **stable under normal/light load now** (verified 200). The 15-client ceiling still 500s under heavy concurrency. **Durable fix is operator-side**: raise the Supabase session Pool Size, or point `DATABASE_URL` at the transaction pooler (`:6543`) and set `PG_USE_TRANSACTION_POOLER=1`. Full write-up + which P2 reports are false positives: `doc/bug-reports.md` → "RESOLUTION".

| # | Task | PR | Status |
|---|------|----|--------|
| U1 | Bookmark / save projects | #50 | ✅ merged, verified |
| U3 | Backfill llm_category | #52, #53 | ✅ backfilled (1.2% → 99.8%), verified |
| U2 | Backfill AI summaries | #55 | ✅ backfilled (150 → 4,537), verified |
| U4 | AI granular tags | #57 | ✅ shipped + backfilled (3,953/3,953 active), verified |
| U6 | Insight multi-select filter | #59 | ✅ merged, verified |
| U5 | YouTube insight OG image | #60 | ✅ merged, verified |

### U6 — Insight category filter: multi-select

The `/youtube-insights` single-category dropdown is now a row of toggle chips. Pick any combination; state lives in the URL as comma-separated `?category=a,b,c` (chip toggles add/remove, "All" clears). DB `getVideoInsightsByCategory`/`getVideoInsightCount` generalised to a category array (`= any(...)`); the page validates/dedupes the param against the canonical set. Verified `?category=ai_ml,developer_tools` (+`&view=grid`) → 200.

### U5 — YouTube Insight OG image generation

New dynamic 1200×630 OG card at `/og/youtube-insights` (`next/og` `ImageResponse`, edge runtime, static brand design, day-cached) + Open Graph / Twitter `summary_large_image` metadata on the page pointing at it; `metadataBase` added to the root layout so relative URLs resolve absolute. Insights aren't individually routed, so one static page card (not per-insight images) is the right scope. Verified: `/og/youtube-insights` → `image/png` 200 (57 KB), page emits absolute `og:image` + `twitter:card`; card renders correctly (brand wordmark, ▶, category chips).

---

## All Day 2 tasks (U1–U6) complete

Every task shipped via branch → PR → squash-merge → production verification; `pnpm typecheck` (+ a full `next build` for frontend work) before each PR; no direct pushes to main. Two LLM backfills (categories 1.2%→99.8%, summaries 150→4,537) and a tag backfill (3,953/3,953 active) were run in monitored chunks after an `EMAXCONNSESSION` incident was root-caused and fixed — production held HTTP 200 through every subsequent run. Migration 0015 applied via Supabase MCP (user-authorized for this session).

### U4 — AI auto-tagging with granular tags

**Outcome: all 3,953 active projects tagged** (3–5 specific tags each), ~$0.13, ~12 min, production HTTP 200 throughout.

- **Schema**: migration `0015_granular_tags.sql` — `app.project.tags text[]` + GIN index, **applied via Supabase MCP** (you authorized MCP application for this autonomous session; file still in the repo).
- **Worker (PR #57)**: `generate-tags.ts` makes one JSON LLM call per project → normalised lowercase tags (dedupe, strip junk, cap 5). `TAGS_BATCH`/`TAGS_CONCURRENCY` tunables + shared-cursor worker pool; `generate-tags.yml` daily 02:00 with `batch`/`concurrency` dispatch inputs. Backfilled in two monitored chunks (1000, then 2953) at concurrency 6 — 0 failed, 0 empty. Top tags: llm, cli, self-hosted, real-time, ai, productivity, javascript, typescript, open-source, devtool, saas, react.
- **Frontend**: `TagChips` renders clickable `#tag` chips on `/projects` rows & mobile cards, the detail header, and bookmark cards. Click → `/projects?tag=…`; the table filters client-side (`useSearchParams`) with a dismissable active-tag banner. New i18n key `table.filteredByTag` (EN/ZH). Chips/bookmark are z-raised siblings of the card link (valid HTML, whole card still clickable).
- **Scope cut**: tag search in `/api/search` skipped — `/projects?tag=` already delivers the click-a-tag UX; `/api/search` is name-fuzzy (pg_trgm), a separate surface.
- **Verified**: `/projects?tag=llm` → 200; `/projects` HTML emits `/projects?tag=…` chip links across rows.

### U2 — Backfill AI summaries

**Outcome: summaries 150 → 4,537** (active-project coverage ~99.7%), ~$0.15 in DeepSeek tokens, ~28 min, production HTTP 200 throughout.

- **Constraint**: `generate-summaries` makes one *sequential* LLM call per project (prose, not batchable like classify), so the backlog was ~3h serial and the daily cron only does 50/day.
- **Fix (PR #55)**: added `SUMMARY_CONCURRENCY` (default 1 = unchanged daily behaviour; clamped 1–16) via a shared-cursor worker pool, plus `batch`/`concurrency` workflow_dispatch inputs and a 45m timeout. The DB pool (max 2) serialises the UPDATEs; per-item errors are caught so failures retry next run.
- **Run**: two monitored dispatches at concurrency 6 (1000, then 3388) — 999 + 3388 summarised, ~6 + ~22 min, `/projects` polled every ~25–30s, steady 200. 12 newly-collected stragglers remain for the daily cron.
- **Verified**: detail page (`/projects/cloudflare-ai`) now renders the AI Summary block, the "you might also like" related row, and the Bookmark control together.

### Production incident note (shared with the team)

The U3 backfill's first unbounded run caused a brief production `EMAXCONNSESSION` outage (intermittent 500s) because the worker and the public site share one Supabase pooler. Root-caused and fixed (lean reads + chunking) before completing either backfill; every subsequent monitored run held production at HTTP 200. **Lesson for future bulk jobs: keep the worker's per-run DB footprint small and chunk long runs — the Supabase connection ceiling is the binding constraint.**

### U3 — Backfill llm_category coverage

**Outcome: active-project category coverage 1.2% → 99.8%** (≈150 → 4,490 classified), ~$0.11 in DeepSeek tokens, production HTTP 200 throughout (after the connection fix below).

- **Why a plain re-trigger couldn't work**: `llm-classify` is deliberately *gray-zone-only* (rule score 15–39) — one trigger classified just 24 projects. The rules never assign `llm_category` to confidently-scored projects, which is why ~99% sat uncategorised, breaking related-projects, the trends category chart, the `/projects` filter, and search ranking.
- **Fix (PR #52)**: added `LLM_CLASSIFY_ALL=1` mode (default off — scheduled runs unchanged) that classifies every active unclassified project, wired to a `classify_all` workflow_dispatch input.
- **Incident + fix (PR #53)**: the first unbounded run tripped Supabase `EMAXCONNSESSION` and intermittently 500'd the public site (shared pooler). Cancelled it, restored production, then: (1) ALL-mode now skips the snapshot + identity-link full scans (only gray-zone scoring needs them); (2) added `LLM_CLASSIFY_LIMIT` to chunk the backfill into short, connection-releasing runs. Re-ran in 200 → 1500 → 3000 → 50 chunks, monitoring `/projects` every ~25s — steady 200 throughout.
- **Side benefit**: the LLM pruned ≈520 genuine scraped-junk projects to `noise`. Final category mix: devtool 1465, ai/ml 710, productivity 399, open-source 367, other 322, saas 226, security 140, design 136, data 106. Frontend `LLM_CATEGORIES` already matches these 9 values exactly.

### U1 — Bookmark / Save Projects

No-auth bookmarks persisted in `localStorage` (`pt:bookmarks`).

- **`lib/bookmarks.ts`** — `getBookmarks` / `toggleBookmark` / `isBookmarked` + reactive `useBookmark(slug)` / `useBookmarks()` hooks. Same-tab sync via a `CustomEvent` (the native `storage` event only fires cross-tab), cross-tab via `storage`. SSR-safe: initial render is "not bookmarked", state reads localStorage after mount (no hydration mismatch).
- **`BookmarkButton`** (Lucide `Bookmark`/`BookmarkCheck`) — `icon` variant on every `/projects` desktop row + mobile card; `labeled` variant on the detail header. The button is a **sibling** of the card/row link (not nested — avoids invalid `<button>`-in-`<a>`) and raises itself above the row's full-bleed link overlay (`relative z-10` + `stopPropagation`/`preventDefault`) so saving never navigates.
- **`/bookmarks`** page + `BookmarksList` client — reads the slug set from localStorage, rehydrates project data from `GET /api/bookmarks?slugs=…` (new `getProjectsBySlugs()`, capped at 200 slugs). Rendered cards are filtered to the live slug set, so un-bookmarking removes a card instantly without waiting on a refetch. Shared `ProjectCard` component in the `/projects` mobile-card style.
- **Nav**: "Bookmarks" link added next to Trends. **i18n**: `nav.bookmarks`, `bookmarks.title`, `bookmarks.empty`, `detail.bookmark`, `detail.bookmarked` (EN/ZH).
- **Decision** (DECISIONS.md): localStorage-only, no DB/auth — zero backend state, no PII; tradeoff is no cross-device sync.

**Verification**: production `/`, `/projects`, `/bookmarks`, `/trends`, `/youtube-insights`, `/api/search?q=ai` → all **200**; `/api/bookmarks?slugs=cloudflare-ai` → 200 with correct project JSON. `pnpm typecheck` + full `next build` passed before PR.

---

# Full Feature Sprint — Response (2026-06-22 / 23)

All 7 tasks (T0–T6) implemented, each as its own branch → PR → squash-merge → production verification. `pnpm typecheck` passed before every PR. No direct pushes to main.

| # | Task | PR | Status |
|---|------|----|--------|
| T0 | Mobile horizontal scroll fix | #43 | ✅ merged, verified |
| T1+T6 | Detail-page richness + "You might also like" | #44 | ✅ merged, verified |
| T2 | Fuzzy search (pg_trgm) | #45 | ✅ merged, verified |
| T3 | Score heat indicator | #46 | ✅ merged, verified |
| T4 | Trends dashboard visuals | #47 | ✅ merged, verified |
| T5 | Reddit collector 403 fix | #48 | ✅ merged, **workflow run verified** |

T1 and T6 were combined into one PR (T6 explicitly extends T1, same files).

## What shipped

- **T0** — `globals.css`: clip `overflow-x` at both `html` + `body` with `max-width: 100%`. The prior body-only `overflow-x-clip` left the viewport scroll container free to propagate to `<html>`.
- **T1+T6** — breadcrumb (`Projects > {name}`), new `RelatedProjects` server component ("You might also like" / "猜你喜欢", up to 4 same-category mini-cards), localized graceful 404 (`not-found.tsx`), `getRelatedProjects()` + `RelatedProject` type, i18n keys. **AI summary already rendered correctly on prod** (verified `/projects/speakup`) — the reported bug was summary-less pages (only 150/4344 projects have a summary).
- **T2** — migration `0014_pg_trgm_search.sql` (**applied to prod**: `pg_trgm` + GIN trigram indexes), `GET /api/search?q=` (`searchProjects()`), debounced `ProjectSearch` client component with results dropdown.
- **T3** — coloured left border on `/projects` cards/rows keyed on GitHub stars (emerald ≥1000, amber ≥100).
- **T4** — `/trends`: CSS-only distribution bar chart, numbered Top-5 list, week-over-week comparison card. New `getRecentWeeklyTrends`, `getTrendCategoryDistribution`, `getTrendTopProducts`.
- **T5** — `fetchSubredditHot`: JSON on `old.reddit.com` (UA rotation, 403/429 retry) → **RSS fallback** (`parseRedditRss`). Verified on a real GitHub Actions run: **49 posts stored** where it previously 403'd entirely.

## Schema deviations (specs assumed columns that don't exist — see DECISIONS.md)

`app.project` has **no `stars`** (stars live in `raw.snapshot`, lateral-joined) and **no `quality_score`** column.
- T6 weighting `stars*0.7 + quality_score*0.3` → ordered by **stars desc**.
- T3 thresholds use **github_stars** instead of a 0–100 quality score.
- T2 search returns `stars` from snapshot, drops the nonexistent `score`.
- T4 "category distribution" falls back to `platform` (trend products are mostly unclassified HN/PH posts).

## Migrations applied

- `0014_pg_trgm_search.sql` — applied to prod (`wpleklpvjmzfhfqukwzz`) via Supabase. Idempotent (extension + indexes).

## Production verification (final)

`/`, `/projects`, `/trends`, `/youtube-insights`, `/feed/projects.xml`, `/projects/cloudflare-ai`, `/api/search?q=ai` → all **200**; unknown slug → **404**.

## Known limitations / follow-ups

- **Reddit RSS** carries no score/comment counts (stored as 0); GitHub cross-matching only works for link posts. A 3rd-subreddit RSS 429 can occur under rapid succession — increasing the inter-subreddit delay would smooth it.
- **Related projects / heat / search ranking** would all sharpen with a real project-level `quality_score` and `llm_category` backfilled beyond the current 87/4344.
