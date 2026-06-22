# Feature Note — 2026-06-22

## Browser Test Results

### Bugs Found
- [P2] **/ (mobile)**: Page has horizontal scroll on mobile (375px width)

### Feature Gaps
- None found

### Errors
- None

## Scope Mismatch — 2026-06-22

**Task:** Mobile horizontal scroll fix (P2 — / mobile 375px)
**Queue:** Backend (REQUEST.md) — **WRONG QUEUE**
**Should be:** Frontend (FRONTEND_REQUEST.md)

### Why
- PR #39 (`2ca9892`) already merged `overflow-x-clip` on `<body>` — fix is in place
- The regression requires frontend debugging (CSS/component inspection at 375px)
- Backend rules forbid touching `apps/web/` where the fix lives
- Prior reroute precedent: commit `a7f7716` already moved this from backend→frontend

### Recommended fix for frontend agent
1. Add `html { overflow-x: clip; }` to `apps/web/app/globals.css` (belt-and-suspenders)
2. Inspect components on `/` for overflow causes at 375px
3. See `assistant-queue/RESPONSE.md` for full investigation
