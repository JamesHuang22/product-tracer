# Product Tracer — Status (2026-06-01)

## ✅ What's done

### Documentation & specs
| | |
|---|---|
| **PRD v0.3** (`PRD.md`) | Full product spec; 5 monitoring sources, 4 AI tasks, 6-month timeline |
| **DB schema doc** (`packages/db/SCHEMA.md`) | All 9 tables, conventions, indexes, deferred RLS plan |
| **Architecture diagram** (in PRD §8.1) | Single Postgres / two schemas / engine split |
| **Frontend-design skill** (`.claude/skills/frontend-design/SKILL.md`) | Official Anthropic skill, installed but not actively invoked |
| **Assistant queue** (newly added) | Async collaboration system between James and Claude Code |

### Infrastructure
| | |
|---|---|
| **Monorepo** | pnpm workspaces; `apps/web`, `apps/worker`, `packages/{types,db}` |
| **TypeScript** | 5.7 strict + `noUncheckedIndexedAccess` across all 4 workspaces |
| **Supabase Postgres** | Live; 9 tables; migration 0001 applied; pgvector + pgcrypto installed |
| **DB clients** | Both: `createServiceClient` (Supabase JS for future web/auth) + `createSqlClient` (postgres.js direct for worker) |

### Data collection — both running on 4h cron
| Source | Status | Coverage |
|---|---|---|
| **GitHub** | Live since 2026-05-21 | 4 discovery queries + refresh known; 1,133+ projects, noise filter, 5000 req/h authenticated |
| **Hacker News** | Live since 2026-05-24 | Show HN front page; ~100 stories/run; URL → GitHub hard-match |
| Product Hunt | Not started | P0 per PRD; commercial-use blocker pending |
| Reddit | Not started | P1 |
| X | Not started | P2 |

### Frontend (`apps/web`)
| | |
|---|---|
| **`/` home** | 5-platform grid: GH + HN live with top 5 per platform, PH/Reddit/X coming-soon placeholders |
| **`/projects`** | Full TanStack Table, sortable + filterable, mobile cards. Whole rows clickable. |
| **Layout** | Inter font, sticky site header, neutral palette, dark-mode aware |
| **Data layer** | `apps/web/lib/db.ts` — direct Postgres via `postgres.js`, lateral joins for latest snapshot per platform |

### Operations
| | |
|---|---|
| **GitHub Actions cron** | 2 workflows (`collect-github`, `collect-hackernews`), every 4h offset 30 min |
| **Reliability** | ~85% success on GH (timeout issues), 100% on HN |
| **Branches merged** | 14 PRs total |
| **Skill installed** | `frontend-design` (dormant unless invoked) |

## ⚠ What's pending — ranked

### Tier 1: Reliability (do soon)
| # | Problem | Fix size |
|---|---|---|
| 1 | **GH collector timeout** — recurring cancelled runs at ~11–12 min, including today (Jun 1, 13:55 UTC) | Parallelize `fetchKnownReposByIds` in batches of 10 — ~1 session |

### Tier 2: First real cross-platform signals (do next)
| # | What | Why now |
|---|---|---|
| 2 | **Cross-platform matching investigation** — went from **0 → 1** matched project this week (first ever!) | Architecture works but yield is tiny. Need to understand why so few. |
| 3 | **Soft match + LLM verify (T2)** | Hard-match URL alone is leaving cross-platform signal on the table |

### Tier 3: Visible product polish
| # | What | Why |
|---|---|---|
| 4 | **T1 Summarize (Haiku)** | Cleaner one-liners on `/projects`; establishes Anthropic SDK pattern |
| 5 | **T3 Velocity** | Oldest projects now have **48 snapshots** — deltas are very computable; surface "fastest growing today" |
| 6 | **`/platform/[slug]` detail pages** | Currently "View all" → unfiltered `/projects` |

### Tier 4: Coverage
| # | What | Why |
|---|---|---|
| 7 | **Reddit collector** | r/SideProject, r/indiehackers — high indie signal, no API friction |
| 8 | **Product Hunt collector** | P0 per PRD, blocked on commercial email approval |
| 9 | **Email digest + Resend + magic-link subscribe** | The "5-min morning read" half of the product |

### Tier 5: Hygiene
- 6 stale local branches to delete (collector-github-v2, collector-hackernews, skill-frontend-design, web-clickable-rows, web-project-list, web-platform-sections — all merged)
- `jbk/skeleton-v0.1` decision still parked (early collector drafts, never merged)

## 📊 Current data state

```
Projects:           1,339
Identity links:     1,338  (one project per platform, mostly)
Snapshots:         34,216  (29,518 GH + 4,698 HN)
Project metrics:    6,799  (one row per project per day)
Signals:                0  (T3 not built)
Subscribers:            0  (email not built)
Collector errors:       0  (clean)

Oldest snapshot:    May 21 2026
Latest snapshot:    Jun 01 07:34 PDT
Cross-platform:     1 project  ← FIRST EVER (was 0 last week)

Snapshots per oldest project:  48
```

## 🏛 System architecture

```
                ┌──────────────────────────────────────────┐
                │  GitHub Actions (cron, every 4h)         │
                │  ─────────────────────────────────────   │
                │  collect-github.yml   :00 of 0,4,8,…UTC  │
                │  collect-hackernews   :30 of 0,4,8,…UTC  │
                │  Fresh Ubuntu VM per run, no servers     │
                └────────────┬─────────────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────┐
        │  apps/worker (Node 22 + tsx)       │
        │  ─────────────────────────────     │
        │  collectors/                       │
        │   ├ github.ts (REST search, refresh) ◀── GitHub API
        │   └ hackernews.ts (Firebase REST)    ◀── HN API
        │  scripts/                          │
        │   ├ collect-github.ts              │
        │   └ collect-hackernews.ts          │
        └────────────────┬───────────────────┘
                         │ postgres.js (direct PG, session pooler)
                         ▼
        ┌────────────────────────────────────┐
        │  Supabase Postgres                 │
        │  ──────────────────────────────    │
        │  raw  schema (append-only)         │
        │    ├ snapshot          ← writes    │
        │    └ collector_error               │
        │  app  schema (query-ready)         │
        │    ├ project           ← upserts   │
        │    ├ identity_link     ← inserts   │
        │    ├ project_metric    ← upserts   │
        │    ├ project_embedding (empty, T2) │
        │    ├ signal            (empty, T3) │
        │    ├ subscriber        (empty, P1) │
        │    └ digest_run        (empty, P1) │
        │  Extensions: vector, pgcrypto      │
        └────────────────┬───────────────────┘
                         │ postgres.js (same lib, different process)
                         ▼
        ┌────────────────────────────────────┐
        │  apps/web (Next.js 15 RSC)         │
        │  ──────────────────────────────    │
        │  lib/db.ts — server-only queries   │
        │    ├ getAllProjects()              │
        │    ├ getPlatformTop()              │
        │    └ getPlatformProjectCount()     │
        │  app/page.tsx       → 5 sections   │
        │  app/projects/...   → table        │
        │  components/        → site-header  │
        │                       platform-section
        │                       (projects-table)
        └────────────────┬───────────────────┘
                         │ SSR'd HTML over HTTPS
                         ▼
                  ┌─────────────┐
                  │   Browser   │  (no DB credentials cross to client)
                  └─────────────┘

Not yet built:
        ┌────────────────────────────────────┐
        │  Match Engine (T1, T2)             │ — derives app.project from
        │  Signal Engine (T3, T4)            │   snapshots; populates
        │  Notification Engine               │   embeddings, signals
        │  (Anthropic SDK + Resend + auth)   │
        └────────────────────────────────────┘
```

### Key architectural decisions

| Decision | Why |
|---|---|
| **Single Postgres, 2 schemas** (raw + app) | One backup, one connection pool; rerun matching on raw without touching app |
| **Worker uses direct PG, not Supabase JS** | Bypasses PostgREST's exposed-schemas gate; faster bulk inserts |
| **Web uses RSC + direct PG, no API layer** | Solo dev — one less service to deploy; type safety via function signatures, not HTTP |
| **GitHub Actions for cron, not Railway/Fly** | Zero infra; runs from `main`; free-tier sufficient at our cadence |
| **Two collectors, two workflows** (not one) | Independent failure domains; HN can succeed when GH times out |

## 🎯 Honest recommendation for next move

**Fix the GH timeout (Tier 1) before anything else.** It's one short session and stops the silent failures from getting worse as the project universe grows (already ~1,100 known repos to refresh per run).

Then **T3 Velocity** (Tier 3, #5). Why T3 specifically:
- You finally have 48 snapshots per project for the oldest cohort — velocity is *meaningfully computable*
- You just hit your first cross-platform match (0 → 1) — momentum is building toward "real signals"
- T3 produces visible output (a "Movers" section on the frontend, populating `app.signal` for the first time)
- Independent of email/auth infra

This sequencing turns the data accumulation of the past 11 days into your first actual *signal* — which is what the whole project is about.
