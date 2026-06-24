# Feature Note — 2026-06-23

## Product Tour Focus: /projects

### Bugs Found
- [P2] No breadcrumb on project detail pages (already documented)
- [Observation] No tags/badges on listing cards (minor UX gap)
- [Observation] Thin content ~175 words per project detail page

### Feature Ideas (not in queue)
- **Quality score column** — next-request.md already suggests this. No new proposal needed.
- **Project tags/badges on listing cards** — adding visible category tags to each project card on /projects would improve scannability without server changes.

### No new feature proposals written
Queue files already contain content. Skipped.

### Tour Details
- Rotation focus: /projects (search, sort, filter, AI summaries, detail page)
- Desktop: 1400px viewport
- ZH locale verified: 146 CJK chars (improvement ✓)
- HTTP errors: 0 — all resources clean
- Timestamp: 2026-06-24T02:22:43.393Z

---

## Day 2 Sprint — Completed 2026-06-23

All 6 tasks (U1–U6) shipped:

| # | Task | PRs | Status |
|---|------|-----|--------|
| U1 | Bookmark / Save Projects | #50 | ✅ merged, verified |
| U2 | Backfill AI summaries (150→4,537) | #55 | ✅ verified |
| U3 | Backfill llm_category (1.2%→99.8%) | #52, #53 | ✅ verified |
| U4 | AI granular tags (3,953/3,953) | #57 | ✅ shipped, verified |
| U5 | YouTube Insight OG image | #60 | ✅ merged, verified |
| U6 | Insight multi-select filter | #59 | ✅ merged, verified |

### Key outcomes
- **Bookmarks**: localStorage-only, no auth, BookmarkButton on rows/cards/detail, /bookmarks page, cross-tab sync
- **AI auto-tagging**: migration 0015 applied, 3–5 granular tags per project, TagChips on /projects and detail pages, tag click → /projects?tag=... filter
- **OG image for YouTube insights**: dynamic 1200×630 card at /og/youtube-insights, absolute og:image + twitter:card metadata
- **Multi-select insight filter**: toggle chips replacing single-category dropdown, state in URL, DB `= any(...)` query
- **Incident learned**: Supabase `EMAXCONNSESSION` from unbounded backfill. Fixed with chunked runs + lean reads. Lesson: keep worker DB footprint small.

### Queue state
- REQUEST.md: **agent session rules** (Phase 2 sprint instructions)
- FRONTEND_REQUEST.md: **does not exist**
- RESPONSE.md / FRONTEND_RESPONSE.md: contain full sprint logs (preserved)
- next-request.md: shutdown notice + suggestions (quality_score, Reddit hardening, etc.)

---

## Phase 2 Sprint — Completed 2026-06-24

All 3 tasks shipped, each via branch → PR → squash-merge → HTTP 200 verify; `pnpm typecheck` (+ `next build` for frontend) before each PR; no direct pushes to main.

| # | Task | PR | Status |
|---|------|----|--------|
| 1 | Fix empty homepage insight card (P0 bug) | #68 | ✅ merged, verified |
| 2 | Historic weekly trends selector | #69 | ✅ merged, verified |
| 3 | Collector quality + migration 0016 | #70 | ✅ code merged, migration applied; ⚠️ workflow run blocked by billing |

### Key outcomes
- **Empty insight card fix**: root cause — insight with Chinese `key_insight` was suppressed in EN mode (→null) but card still rendered. Fixed with CJK-suppression skip + query guard + page filter (buffer 8→3) + client-side null guard. Verified: bad card gone from EN home, all 3 cards have text.
- **Historic weekly trends**: `getTrendWeeks()` + optional `weekStart` param on trend queries; `/trends?week=` validated against real list with fallback to latest; WoW compares to preceding week; selector hides with one week of data. Verified all weeks 200 incl. garbage param.
- **Collector quality fields**: migration 0016 applied (7 new columns confirmed via Supabase MCP). Collector stores new fields, freshness-filters discovery (>6mo unpushed unless >1000★), bounded best-effort PR/commit enrichment (≤40/run, coalesced), dedup name-pairs gated by same-category / Dice>0.8. Schedule: 4h→2h.

### ⚠️ Open issue
**GitHub Actions billing block.** The post-merge `collect-github` workflow could not start — *"recent account payments have failed or your spending limit needs to be increased."* This blocks every workflow. **Action needed**: resolve GitHub billing / raise Actions spending limit in repo Settings → Billing. Note Task 3 raised the collector cadence to every 2h, increasing Actions usage once billing resumes.
