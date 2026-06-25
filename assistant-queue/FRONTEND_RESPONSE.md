# Frontend Response — Browser-test Run #26 requests (2026-06-24)

| Req | Item | Outcome |
|-----|------|---------|
| FE#2 [P2] | Mobile nav collapse <640px | ✅ #72 — hamburger menu |
| FE#3 [P3] | WoW indicator on /trends top products | ✅ #73 — ↑n/↓n/—/New |
| FE#4 [P3] | Clickable emerging themes | ✅ #74 — link to `/projects?tag=` |
| FE#5 [P3] | Clickable video-highlights links | ⏸️ deferred — needs backend change |
| FE#1 [P2] | Locale-prefixed routes (`/en/*`, `/zh/*`) | ❌ won't do — false premise (by design) |

- **FE#2** — the header packed brand + 4 links + language switcher + theme toggle into one flex row with no sub-`sm` handling, overflowing 375px. Inline nav is now `hidden sm:flex`; mobile shows the theme toggle + a hamburger toggling a dropdown panel (links + language switcher). New i18n `nav.menu`/`nav.close`.
- **FE#3** — each top-product row shows its rank change vs the previous week (↑n / ↓n / — / **New**), computed from the prior week's `top_products` by score; renders nothing for the oldest week (no week to compare). New i18n `trends.wowNew`/`wowUp`/`wowDown`.
- **FE#4** — emerging-theme chips now link to `/projects?tag=<slug>` (theme normalised to the tag form). Note: themes are freeform analysis phrases, so some links will land on an empty tag filter — it's an exploration affordance, not a guaranteed hit.
- **FE#5 — deferred (not a frontend-only fix).** `app.weekly_trend.video_highlights` is a single freeform prose paragraph with **no structured video references** (no titles/URLs) and no inline links to auto-linkify. Adding per-video "Watch" links requires the `weekly-trend` generator to emit structured `{ title, video_url }` records (schema + worker change), not a frontend tweak. Recommend filing as a backend task.
- **FE#1 — won't do (false premise).** The request assumes a `[locale]` route segment, but the app's i18n is **deliberately cookie-based**: one set of routes, language toggled via the `locale` cookie + the in-header switcher (see `DECISIONS.md`). There is no `[locale]` directory and there are intentionally **no `/en/*` or `/zh/*` paths** — they 404 by design. (Verified live: `/zh/projects`, `/zh/trends`, `/en/trends`, `/zh/youtube-insights`, `/zh/bookmarks` **all 404**; the report's claim that `/zh/projects` works is incorrect.) Adding path-based locale routing would rip up the established architecture for no user benefit; the language toggle already works app-wide. If path-based i18n is genuinely wanted, that's a deliberate product decision to raise explicitly, not a bug fix.

---

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
