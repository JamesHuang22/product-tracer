# Bug Reports

> Automated browser test + human-like product tour — 2026-06-25 06:05 UTC
> Tester: JBK (Product Manager + QA Lead)

---

## P0 — Database connection missing: all DB-dependent pages return 500

**Severity**: P0 (site down)  
**First seen**: 2026-06-25 06:05 UTC  
**Environment**: localhost:3000 (next dev --turbopack)

### Impact
4 out of 5 critical pages are completely broken:

| Page         | Status | Error                                                   |
|-------------|--------|---------------------------------------------------------|
| `/`         | 500    | `Missing DATABASE_URL`                                  |
| `/projects` | 500    | `Missing DATABASE_URL`                                  |
| `/trends`   | 500    | `Missing DATABASE_URL`                                  |
| `/youtube-insights` | 500 | `Missing DATABASE_URL`                                  |
| `/bookmarks` | 200   | ✅ Works (purely client-side, no DB calls)              |

### Root cause
No `.env` or `.env.local` file exists in `apps/web/`. The `DATABASE_URL` environment variable is not set. The app needs a Supabase session pooler URI (specified in `.env.example`).

```bash
# Expected env (from .env.example)
DATABASE_URL=postgresql://...
```

The `.env.example` file exists at the repo root but all values are blank. The actual `.env` (which is gitignored) is missing entirely.

### Reproduction
1. Ensure no `.env` exists in `apps/web/` or repo root
2. Run `pnpm dev` (which launches `next dev --turbopack` on port 3000)
3. Visit `http://localhost:3000/projects` (or `/`, `/trends`, `/youtube-insights`)
4. Observe: blank page → "Application error: a server-side exception" → browser console shows `Missing DATABASE_URL. Check .env`

### Resolution needed
1. Create `apps/web/.env.local` (or `.env` at workspace root) with a valid `DATABASE_URL` from Supabase
2. Or set `DATABASE_URL` in the shell environment (e.g., `export DATABASE_URL=...` before `pnpm dev`)
3. Verify all pages return HTTP 200 after fix

---

## P1 — Missing search/filter UI on /projects

**Severity**: P1  
**Status**: Not directly testable due to P0 (DB down), but inferred from component scan

### Observation
When the DB is fixed, verify:
- Search input is present
- Sort/filter `<select>` elements exist
- Project cards render with images, descriptions, and links

### Reproduction (blocked by P0)
1. Fix database connection
2. Visit `/projects`
3. Confirm search bar, sort controls, and project grid render correctly

---
