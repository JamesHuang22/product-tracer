# Product Tracer — Development Queue

> All task state lives here. Coder agents read this file to find work, write to it to report progress.
> Lock mechanism: both coders compete for `ready` tasks. First to set `Locked by` wins.
> See `doc/AUTOMATION_SYSTEM.md` for full architecture.

---

## [2026-06-28] TASK-005: Landing page — "OpenProduct" marketing homepage
- **Priority**: P0
- **Status**: pending
- **Locked by**:
- **Locked at**:
- **Acceptance**:
  - A new landing page at `/` with flashy animations/effects that sells the product
  - Tagline: "Stay ahead of the curve. Discover the latest products building around the world."
  - "Get Started" CTA button → login/signup
  - After login → redirect to the existing product dashboard (the current `/` page moves to `/dashboard`)
  - Must be bilingual (EN/ZH), include i18n keys
  - Visually impressive — animated hero, gradient effects, particle effects or similar
- **Spec**:
  *(filled by Planner)*

---

## [2026-06-28] TASK-006: Fix empty YouTube insight cards on /youtube-insights
- **Priority**: P0 BUG
- **Status**: pending
- **Locked by**:
- **Locked at**:
- **Acceptance**: Every card on /youtube-insights must display content. No card should show only "Neutral / Other / Watch on YouTube" with empty insight text.
  - Investigate: are these rows with null/empty `key_insight` in the DB? Or is the frontend failing to render?
  - Fix: ensure every card has visible content. If DB has null insights, show a fallback like "Analysis pending" or fetch the raw title/description.
- **Spec**:
  *(filled by Planner)*

---

## [2026-06-28] TASK-004: Product rename — "Product Tracer" → "OpenProduct"
- **Priority**: P0
- **Status**: pending
- **Locked by**:
- **Locked at**:
- **Acceptance**: All references to "Product Tracer" throughout the codebase are changed to "OpenProduct". Site title, nav bar, page titles, meta tags, OG images, README, CHANGELOG.
- **Spec**:
  *(filled by Planner)*

---

## [2026-06-28] TASK-003: Re-enable all collectors + verify post-unblock
- **Priority**: HIGH
- **Status**: pending
- **Locked by**:
- **Locked at**:
- **Acceptance**: All 5 core collectors (GitHub, HN, PH, Reddit, YouTube) run successfully. Any non-billing failures reported.
- **Spec**:
  *(filled by Planner)*

---

## [2026-06-28] TASK-002: GitHub collector — richer data, freshness filter
- **Priority**: P1
- **Status**: pending
- **Locked by**:
- **Locked at**:
- **Acceptance**: GitHub collector fetches more fields (description, stars, language, topics) and skips repos older than 30 days. **(BLOCKED by TASK-003 — need collectors running first)**
- **Spec**:
  *(filled by Planner)*

---

## [2026-06-28] TASK-001: Fix locale-prefixed routes for /trends, /youtube-insights, /bookmarks
- **Priority**: P2
- **Status**: pending
- **Locked by**:
- **Locked at**:
- **Acceptance**: `/en/trends`, `/zh/trends`, `/en/youtube-insights`, `/zh/youtube-insights`, `/en/bookmarks`, `/zh/bookmarks` all return 200 with correct locale content
- **Spec**:
  *(filled by Planner)*

---

## Done Tasks

## [2026-06-27] TASK-000: User Auth + Synced Bookmarks
- **Priority**: P0
- **Status**: done
- **PR**: #77
- **Verify**: PASS — all pages 200, auth flow works
