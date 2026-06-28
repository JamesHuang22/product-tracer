# Product Tracer — Development Queue

> All task state lives here. Coder agents read this file to find work, write to it to report progress.
> Lock mechanism: both coders compete for `ready` tasks. First to set `Locked by` wins.
> See `doc/AUTOMATION_SYSTEM.md` for full architecture.

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

## [2026-06-28] TASK-002: GitHub collector — richer data, freshness filter
- **Priority**: P1
- **Status**: pending
- **Locked by**:
- **Locked at**:
- **Acceptance**: GitHub collector fetches more fields (description, stars, language, topics) and skips repos older than 30 days
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

## Done Tasks

## [2026-06-27] TASK-000: User Auth + Synced Bookmarks
- **Priority**: P0
- **Status**: done
- **PR**: #77
- **Verify**: PASS — all pages 200, auth flow works
