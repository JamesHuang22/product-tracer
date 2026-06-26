# Agent Session — Shutdown Notice (2026-06-26)

Reached **6 consecutive empty queue polls (3 hours idle)** across two consecutive
goal cycles — no new tasks in `REQUEST.md` or `FRONTEND_REQUEST.md` since the
prior session completed all queued work. The queue files still hold only the
already-triaged Run #26 items (FE#2 shipped #72; FE#1 declined by design).
Shutting down per the agent-session protocol (Rule 6).

## State at shutdown

- Local `main` in sync with `origin/main`; working tree clean.
- No task in progress (no open branch/PR awaiting merge or verify).
- All previously queued work shipped and verified (see prior notice below).

## Still open — operator action required (cannot fix from code)

1. **Production P0 — Supabase `EMAXCONNSESSION`** (`doc/bug-reports.md`). Session
   pooler capped at 15 clients; mitigated (#62 pool max 1; #63/#64 transaction
   pooler opt-in), stable under normal load. **Durable fix:** raise the Supabase
   session Pool Size, or point `DATABASE_URL` at the `:6543` transaction pooler
   and set `PG_USE_TRANSACTION_POOLER=1`.
2. **GitHub Actions blocked by billing** — workflows can't start: *"recent
   account payments have failed or your spending limit needs to be increased."*
   Resolve in repo Settings → Billing.

## To resume

Add tasks to `REQUEST.md` / `FRONTEND_REQUEST.md` and start a new agent session
(or say "pull now").

---

# Agent Session — Shutdown Notice (2026-06-24)

Reached **15 consecutive empty queue polls** (no new tasks in `REQUEST.md` /
`FRONTEND_REQUEST.md`) after completing all queued work — shutting down per the
agent-session protocol.

## Shipped this session

**Day 2 (U1–U6)** — bookmarks #50; `llm_category` backfill 1.2%→99.8% #52/#53;
AI summaries 150→4,537 #55; granular tags + 3,953 tagged #57; insight
multi-select filter #59; insight OG image #60.

**Phase 2 (REQUEST.md, 3 tasks)** —
- Task 1 #68 — fixed empty homepage insight card (real cause: a `key_insight`
  column holding Chinese → suppressed in EN but card still rendered).
- Task 2 #69 — historic weekly-trends selector (`?week=`).
- Task 3 #70 — collector quality columns (migration **0016**, applied via MCP),
  GitHub collector enrichment + freshness filter + 4h→2h schedule, stricter dedup.

**Frontend (FRONTEND_REQUEST.md, browser-test Run #26)** —
- FE#2 #72 — mobile nav hamburger (<640px).
- FE#3 #73 — week-over-week rank badge on /trends top products.
- FE#4 #74 — clickable emerging-theme chips → `/projects?tag=`.
- FE#5 — **deferred** (video-highlights links need structured video refs in the
  weekly-trend generator — not a frontend-only fix).
- FE#1 — **declined** (locale-prefixed `/en/* /zh/*` routes: i18n is cookie-based
  by design; those 404 intentionally — verified live). See `FRONTEND_RESPONSE.md`.

All via branch → PR → squash-merge → HTTP 200 verify; typecheck (+ `next build`
for frontend) before each PR; no direct pushes to main. Docs in CHANGELOG /
DECISIONS / RESPONSE / FRONTEND_RESPONSE.

## Recurring tester false positives (already triaged — not bugs)

- `key_insight` "leak" on the homepage — it's the normal Next.js RSC props
  payload (escaped JSON in a `<script>`), **not** user-visible; `key_insight`
  must ship because the card renders it.
- `/en/* /zh/*` 404 — by design (cookie-based i18n; no `[locale]` segment).
- "missing breadcrumb / related / AI summary / search filter" — all present;
  reported while the site was 500ing during the connection-pool incident.
