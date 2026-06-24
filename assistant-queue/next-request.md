# Agent Session — Shutdown Notice (2026-06-23)

The autonomous agent session reached **15 consecutive empty queue polls** (no new
tasks in `REQUEST.md` / `FRONTEND_REQUEST.md`) after completing all queued work,
and is shutting down per the agent-session protocol.

## Shipped this session — Day 2 sprint U1–U6 (all merged + production-verified)

| Task | Summary | PR(s) |
|---|---|---|
| U1 | Bookmarks (localStorage, `/bookmarks`, toggles, nav) | #50 |
| U3 | Backfill `llm_category` — **1.2% → 99.8%** (≈150 → 4,490) | #52, #53 |
| U2 | Backfill AI summaries — **150 → 4,537** (~99.7%) | #55 |
| U4 | Granular tags (migration 0015, `generate-tags`, `TagChips`, `?tag=` filter) — **3,953/3,953 tagged** | #57 |
| U6 | Insight category multi-select filter | #59 |
| U5 | YouTube insight OG image + share metadata | #60 |

Each: branch → PR → squash-merge → Vercel verify; typecheck (+ `next build` for
frontend) before every PR; no direct pushes to main. Docs in `CHANGELOG.md`,
`DECISIONS.md`, `RESPONSE.md`. ~$0.39 total LLM spend across the three backfills,
all run in monitored chunks. Migration 0015 applied via Supabase MCP
(operator-authorized for this session).

## ⚠️ OPEN — requires operator action (cannot be fixed from code alone)

**Production P0: Supabase connection-pool exhaustion** (`EMAXCONNSESSION`, see
`doc/bug-reports.md` BUG-001…005). The app uses Supabase's **session-mode pooler
(port 5432)**, hard-capped at **15 clients** — too low for serverless; it 500s
under concurrency.

- Mitigated (merged): pool `max` 2→1 (#62); transaction-pooler switch made
  **opt-in** after enabling it by default caused hangs (#63/#64). Site is stable
  under normal/light load (verified HTTP 200), but the 15-client ceiling remains.
- **Durable fix (you):** either raise the Supabase session **Pool Size** above 15,
  **or** point `DATABASE_URL` at a verified **transaction pooler** (`:6543`, may
  need the IPv4 add-on) and set `PG_USE_TRANSACTION_POOLER=1`.

## Suggested follow-ups (not yet done)

1. **Project-level `quality_score`** — a real 0–100 column (blended
   stars/recency/cross-platform signal) so heat, recommendation weighting, and
   search ranking can use `stars*0.7 + quality_score*0.3` instead of stars-only.
2. **Reddit collector hardening** — RSS posts have score=0; occasional 3rd-subreddit
   RSS 429 under rapid succession. Longer inter-subreddit delay or an OAuth/proxy
   path to recover score/comment counts.
3. **Minor UI** — `favicon.ico` 404; homepage H1 spacing ("signalsfor").
4. **Re-verify live (after the pooler fix)** the `/projects` category dropdown
   filter and search behaviour — the tester flagged them during the outage, but
   they appear correctly wired.

## Tester P2 false positives (for context)

Several `doc/bug-reports.md` P2s were logged while the site was down (so nothing
rendered) or misread the design: "missing breadcrumb" / "no related projects"
(both exist), "search doesn't filter" (that box is the fuzzy dropdown, not the
table filter — by design), "ZH i18n leak" (project data is intentionally
untranslated, only chrome is localised).

## To resume

Add tasks to `REQUEST.md` / `FRONTEND_REQUEST.md` and start a new agent session
(or say "pull now").
