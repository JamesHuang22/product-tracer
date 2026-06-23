<<<<<<< HEAD
# Frontend Response

_Empty — awaiting next frontend task._

---

_Last cleared: 2026-06-22 14:15 PDT (processed AI summaries response, PR #41 logged in doc/feature-note.md)_
=======
# Frontend Response — Detail Page Content Richness (+ sprint frontend tasks)

**Status: ✅ Done.** All frontend tasks shipped and verified on production (HTTP 200). PRs #44 (detail page + recommendations), #45 (search), #46 (heat), #47 (trends), #43 (mobile scroll).

## Detail page (PR #44)

1. **AI summary rendering** — *no fix needed.* The query (`getProjectBySlug` → `to_jsonb(p) ->> 'ai_summary'`) and the render block in `page.tsx` were already correct; verified live on `/projects/speakup`. The "content desert" tour hit summary-less pages — only **150 / 4344** projects have a summary so far (daily cron backfills 50/day).
2. **Breadcrumb** — semantic `<nav><ol>` `Projects > {name}` at the top.
3. **Structured sections** — Header → AI Summary → Cross-platform signals → Related Projects.
4. **Related Projects** — new `components/related-projects.tsx` (async server component): up to 4 same-`llm_category` mini-cards, excludes current + dedup-merged, ordered by GitHub stars. Labeled **"You might also like" / "猜你喜欢"** (T6). New `getRelatedProjects()` + `RelatedProject` type in `lib/db.ts`.
5. **Graceful 404** — new `app/projects/[slug]/not-found.tsx`, centered + localized, "Browse all projects" link.
6. **ZH i18n** — `detail.relatedTitle`, `detail.relatedSubtitle`, `detail.notFound`, `detail.browseAll` (EN/ZH).

## Other frontend tasks

- **Fuzzy search (T2)** — `ProjectSearch` client component on `/projects`: 300ms debounce, Lucide `Search` icon, results dropdown linking to detail pages, backed by `GET /api/search` (pg_trgm).
- **Heat indicator (T3)** — coloured left border on cards/rows by GitHub stars.
- **Trends visuals (T4)** — CSS-only bar chart, Top-5 list, week-over-week card on `/trends`.
- **Mobile scroll (T0)** — `overflow-x: clip` at `html` + `body`.

## Acceptance criteria

1. ✅ AI summaries render (already worked; verified)
2. ✅ Breadcrumb `Projects > {name}`
3. ✅ Related projects — 4 same-category cards, ordered by stars
4. ✅ Graceful localized 404
5. ✅ ZH locale shows Chinese labels
6. ✅ `pnpm --filter @product-tracer/web typecheck` passes
7. ✅ No mobile horizontal-scroll regression (hardened in T0)

## Deviation

The related-projects spec query used `p.stars`; `app.project` has no such column, so stars come from `raw.snapshot` (as the rest of `lib/db.ts` does). The T6 `stars*0.7 + quality_score*0.3` weighting collapses to stars (no `quality_score` column). See DECISIONS.md.
>>>>>>> 40b5b15106c71ca47c7296a5fac2cab60c68d85f
