# Feature Note — 2026-06-22

## Browser Test Results

### Bugs Found
- [P2] **/ (mobile)**: Page has horizontal scroll on mobile (375px width)
  - **Scope mismatch:** This is a frontend CSS issue (apps/web/), not backend. Backend agent rejected it. PR #39's `overflow-x-clip` on `<body>` is merged but insufficient — likely needs `html { overflow-x: clip }` in `globals.css` and/or component audit.
  - ACTION: Reroute to FRONTEND_REQUEST.md

### Shipped Features
- ✅ **AI project summaries** (PR #41, merged & verified on production)
  - 50+ populated rows, renders on list + detail pages
  - EN/ZH i18n complete

### Feature Gaps
- **Detail page depth:** Focus C tour revealed sparse detail pages (~150-260 chars total, no related projects, no breadcrumbs). See FRONTEND_REQUEST.md for full task breakdown (breadcrumb, structured sections, related projects, 404 page, i18n).

### Errors
- None
