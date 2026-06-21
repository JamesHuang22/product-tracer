# Frontend Response — EN-mode Chinese leak + project links

**Status: ✅ Done.** All 4 P1 issues fixed and verified on production (https://product-tracer.vercel.app, HTTP 200).

## PRs
- **#34** — `fix(web): keep Chinese out of EN mode + internal project links` (merged)
- **#35** — `fix(web): strip Chinese one-liners from RSC payload server-side` (merged, follow-up)

## Root causes
1. **Chinese in EN mode.** Not a missing-translation/fallback bug — the *data itself* is partly Chinese in single-language columns. Verified against prod:
   - `app.project.one_liner`: 203/4153 rows contain CJK (no English alternative column exists).
   - `app.video_insight.key_insight` (the "English" field): 12/83 rows contain Chinese.
2. **No project links on /projects.** `projectHref` routed GitHub projects to their external github.com URL; the top-by-stars rows are all GitHub, so the list had **zero** internal project links.
3. **Page-source vs rendered text.** `/` and `/projects` hand data to client components, so even after suppressing *display*, every row's `one_liner` was still serialized into the page **source** (projects EN source: ~6,535 Han chars). Required a server-side fix too.

## What changed (apps/web only)
- `lib/format.ts`: new `cjkShare` / `localizedText` / `localizedPair` helpers. EN mode drops predominantly-CJK (>20%) text where no English alternative exists; bilingual insight fields no longer fall back across languages.
- `youtube-insights/page.tsx`, `components/home-content.tsx`: insight cards + one-liners via the new helpers (display layer).
- `app/projects/projects-table.tsx`: one-liners via `localizedText`; **`projectHref` now routes every row to the internal `/projects/[slug]`** detail page (which keeps a "Visit site" button out to the original URL).
- `app/page.tsx`, `app/projects/page.tsx`: strip Chinese one-liners / resolve insights **server-side** per cookie locale, so the serialized RSC payload (page source) is clean too. Safe for the locale toggle — `setLocale` calls `router.refresh()`, re-running the server components, so 中文 mode re-fetches and still shows Chinese.
- Product **names** left intact — the one place CJK is expected in EN mode.

## Verification (production, `Cookie: locale=en`)
| Page | CJK before | CJK after |
|------|-----------|-----------|
| `/` | 137 | **0** |
| `/projects` | 62 | **0** |
| `/youtube-insights` | 406 | **2** (the `中文` switcher label) |
| `/projects` internal links | 0 | **50** |

- `Cookie: locale=zh` on `/projects` still returns 6751 Han chars → Chinese mode unaffected.
- `pnpm --filter @product-tracer/web typecheck` ✅ on both PRs.
- `curl -sI https://product-tracer.vercel.app/` → `HTTP/2 200`.
- CHANGELOG.md updated.

_No DB changes (frontend-only, as requested). The underlying data-quality issue — Chinese stored in nominally-English columns (`one_liner`, `key_insight`) — is worth a backend follow-up if true bilingual content is desired, but is out of frontend scope._
