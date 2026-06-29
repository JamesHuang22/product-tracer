# OpenProduct — Development Queue

---

## Done Tasks

## [2026-06-28] TASK-006: Fix empty YouTube insight cards on /youtube-insights
- **Priority**: P0 BUG
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-28 16:10 PDT
- **PR**: #82 (merged)
- **Verify**: PASS — EN /youtube-insights renders 20 cards, every card has a text block (title fallback for the 20 CJK-in-EN-column rows), no empty cards, no CJK insight leak; ZH still shows the Chinese insight. Root cause confirmed in DB: 20/117 rows store Chinese in the English `key_insight` column (worker-side data-quality follow-up noted in RESPONSE.md).

## [2026-06-28] TASK-005: Landing page — "OpenProduct" marketing homepage
- **Priority**: P0
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-28 16:35 PDT
- **PR**: #84 (merged)
- **Verify**: PASS — `/` serves the animated landing (gradient mesh, Get Started CTA w/ data-cta, real stats 5,000+ products · 4,500+ AI summaries, 3 features, footer); dashboard moved to `/dashboard` (200, no landing leak); `/en`,`/zh`,`/en/dashboard`,`/zh/dashboard` all 200; ZH landing fully localized (`<html lang=zh>`, 抢先一步…, 立即开始); post-login redirects → /dashboard. Hero is light (First Load ~116 kB, no particle lib — CSS keyframes + ~1kb IntersectionObserver reveal).

## [2026-06-28] TASK-004: Product rename — "Product Tracer" → "OpenProduct"
- **Priority**: P0
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-28 16:20 PDT
- **PR**: #83 (merged)
- **Verify**: PASS — production homepage, /projects, /trends, /youtube-insights, /bookmarks all show "OpenProduct" and 0 "Product Tracer"; `<title>` = "OpenProduct — …"; OG image route 200 (image/png). Technical ids preserved (`@product-tracer/*`, `product-tracer.vercel.app`, DB/API).

## [2026-06-28] TASK-007: Fix weekly trends — dedup weeks, week-unique insights
- **Priority**: P0 BUG
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-28 17:30 PDT
- **PR**: included in main
- **Verify**: Weekly trends now scoped by ISO week, not trailing 7 days

## [2026-06-27] TASK-000: User Auth + Synced Bookmarks
- **Priority**: P0
- **Status**: done
- **PR**: #77
- **Verify**: PASS — all pages 200, auth flow works
