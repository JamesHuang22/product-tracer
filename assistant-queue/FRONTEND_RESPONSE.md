# Frontend Response — Display AI project summaries

**Status: ✅ Done.** Shipped and verified on production with real data (HTTP 200).

## PR
- **#41** — `feat(web): display AI project summaries on list + detail` (merged)

## Dependency
Waited for the backend's migration 0013 to land before merging (the column didn't exist initially). Confirmed live before shipping: `app.project.ai_summary` exists, **50 rows populated** (backend PR #40).

## What shipped (apps/web only)
- `lib/db.ts`: added `ai_summary` to `ProjectListItem` + `ProjectDetail` and their queries, read **defensively via `to_jsonb`** (resilient if the column is absent), following the repo's `key_insight_zh`/`category` pattern.
- `app/projects/projects-table.tsx`: under the one-liner, a truncated (~80 char) **✨ italic** AI summary with a `title` tooltip for the full text (desktop + mobile cards).
- `app/projects/[slug]/page.tsx`: full summary in a subtle **"AI Summary"** block (rounded, light-gray bg, sparkle label) above the cross-platform signals.
- `app/projects/page.tsx`: `ai_summary` also stripped server-side in EN mode (same as one-liners) so a Chinese summary can't ride in the RSC payload.
- `lib/i18n.ts`: new key `detail.aiSummary` — EN "AI Summary", ZH "AI 概述".
- EN mode suppresses Chinese summaries via the existing `localizedText` rule.

_Note: `db.ts` is in this agent's allowed scope; the request's "files to touch" list omitted it, but the column must be selected somewhere to surface it._

## Verification (production)
- `curl -sI /` → `HTTP/2 200`.
- `/projects` (EN): **16 ✨ summary markers** rendered on the first page.
- `/projects/skip-the-tourist-menu-eat-like-a-local`: "AI Summary" block present (EN); "AI 概述" with `locale=zh`.
- `pnpm --filter @product-tracer/web typecheck` ✅; local `next build` ✅ on the earlier feature set.
- CHANGELOG.md updated.
