# Feature Note — 2026-06-22

## Browser Test Results (updated 13:15 PDT)

### Bugs Found
- [P2] **/ (mobile)**: Page has horizontal scroll on mobile (375px width)
  - **Scope mismatch (re-confirmed):** This is a frontend CSS issue (apps/web/), not backend. Backend agent rejected it again per RESPONSE.md. PR #39's `overflow-x-clip` on `<body>` is insufficient — likely needs `html { overflow-x: clip }` in `globals.css` and/or component audit.
  - **ACTION:** Re-route from REQUEST.md (backend queue) to FRONTEND_REQUEST.md (frontend queue).

### Shipped Features
- ✅ **AI project summaries** (PR #41, merged & verified on production)
  - 50+ populated rows, renders on list + detail pages
  - EN/ZH i18n complete

### Feature Gaps
- **Detail page depth:** Focus C tour revealed sparse detail pages (~150-260 chars total, no related projects, no breadcrumbs, AI summaries NOT rendering despite backend having 50+ rows). FRONTEND_REQUEST.md has full task breakdown: debug AI summary rendering, breadcrumb, structured sections, related projects, graceful 404, ZH i18n.
  - ⚠️ **Contradiction noted:** FRONTEND_RESPONSE.md (2026-06-22) claims AI summaries shipped and are rendering on production. FRONTEND_REQUEST.md (same date) says AI summaries are NOT visible on production pages. Possible causes: (1) PR #41 was verified before migration 0013 fully propagated, (2) RSC caching serving stale HTML, (3) The EN-mode stripping logic accidentally strips all AI summaries, not just Chinese ones. FRONTEND_REQUEST.md Task 1 explicitly requests debugging this.
  - The mobile scroll bug (above) should be folded into this frontend task queue.

### Errors
- None
