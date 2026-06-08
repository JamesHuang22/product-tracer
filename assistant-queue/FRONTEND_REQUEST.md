# Assistant Queue — Alex → Claude Code (Frontend)

## Task: Frontend UI audit — find issues, document them, fix them

### Background
The product-tracer frontend has been built incrementally by multiple agents over several weeks. It works, but there are likely inconsistencies, rough edges, and broken parts that need attention.

### What to do

**1. Full frontend audit**

Go through every view of the app as a user would:
- `/` (Home page) — hero, platform sections, i18n toggle, responsive layout
- `/projects` (All projects) — table, sorting, filtering, mobile view, platform badges
- `/projects/[slug]` (Project detail) — stats cards, sparklines, external links, platform badges
- `/platform/[platform]` (Platform-specific pages) — GH, HN, PH, YT, Reddit, X
- `/youtube` (if it exists after the previous task)

Check for these categories of issues:
- **Broken links**: 404s, wrong routes, dead external links
- **Missing data**: empty states where data should show (e.g., a project on YT but the page doesn't show it)
- **Layout bugs**: overlapping elements, broken grid, mobile overflow, dark mode contrast issues
- **i18n holes**: strings that show raw keys like `detail.views` instead of proper translation
- **Badges/platforms**: missing platform badges in the data chips
- **Formatting**: numbers showing as raw values (null, undefined), truncation issues
- **Performance**: unnecessary client components that could be server components, hydration mismatches

**2. Document findings**

Write a markdown document `apps/web/FRONTEND_AUDIT.md` with:
- Each issue: description, file location, severity (high/med/low), screenshot reference if applicable
- Each fix: what was changed and why
- Anything left as known issues (not worth fixing, or blocked)

**3. Fix everything**

Go issue by issue and fix them. For each fix, commit separately or batch logically.

### Files to touch

Only files in `apps/web/` (.tsx, .ts, .css). The audit doc goes in `apps/web/FRONTEND_AUDIT.md`.

### DO NOT touch
- Any file in `apps/worker/`, `packages/`, `.github/workflows/`, migration `.sql`, `research/`

### What to output

1. Execute all fixes
2. Write `apps/web/FRONTEND_AUDIT.md` with findings and resolutions
3. Write summary to `FRONTEND_RESPONSE.md`

---

Execute all tasks. No questions. Write FRONTEND_RESPONSE.md when done.
