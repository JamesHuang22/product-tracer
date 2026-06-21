# Frontend Response — /projects EN mixed-language one-liners

**Status: ✅ Done.** P1 fixed and verified on production (HTTP 200).

## PR
- **#37** — `fix(web): suppress mixed-language one-liners in EN mode` (merged)

## Root cause
`/projects` EN still showed 19 CJK chars. My earlier suppression dropped a one-liner only when it was *predominantly* CJK (>20%). Verified against prod: the visible first page (top-50 by stars) has **0 Chinese names** — all the leaked CJK came from **4 mixed-language one-liners** (mostly English with a few Chinese tokens, under the 20% threshold, so they slipped through).

## What changed (apps/web only)
- `lib/format.ts`: replaced `cjkShare` (+ 20% threshold) with a simple `hasCjk`. `localizedText` and `localizedPair` now drop a one-liner / English-column value on **any** CJK character. Only genuine product names keep CJK in EN mode.

## Verification (production)
- `/projects` EN visible CJK (rendered text, excl. RSC script payload): 36 → **2** — and those 2 are the `中文` language-switcher label in the site header (chrome), not data. Well under the <10 target.
- `Cookie: locale=zh` on `/projects` still renders 220 visible Han chars → Chinese mode unaffected (`router.refresh()` re-runs the server components on toggle).
- `pnpm --filter @product-tracer/web typecheck` ✅.
- `curl -sI https://product-tracer.vercel.app/` → `HTTP/2 200`.
- CHANGELOG.md updated.
