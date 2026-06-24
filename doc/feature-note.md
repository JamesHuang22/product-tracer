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
- REQUEST.md / FRONTEND_REQUEST.md: **empty** — no pending work
- RESPONSE.md / FRONTEND_RESPONSE.md: contain full sprint log (preserved)
- next-request.md: suggestions for quality_score, Reddit hardening, etc. — all follow-ups, no urgent new tasks
