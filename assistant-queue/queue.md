# Product Tracer — Development Queue

> All task state lives here. Coder agents read this file to find work, write to it to report progress.
> Lock mechanism: both coders compete for `ready` tasks. First to set `Locked by` wins.
> See `doc/AUTOMATION_SYSTEM.md` for full architecture.

---

## [2026-06-28] TASK-006: Fix empty YouTube insight cards on /youtube-insights
- **Priority**: P0 BUG
- **Status**: ready
- **Locked by**:
- **Locked at**:
- **Acceptance**: Every card on /youtube-insights must display content. No card should show only "Neutral / Other / Watch on YouTube" with empty insight text.
  - Investigate: are these rows with null/empty `key_insight` in the DB? Or is the frontend failing to render?
  - Fix: ensure every card has visible content. If DB has null insights, show a fallback like "Analysis pending" or fetch the raw title/description.
- **Spec**:
  **Root cause hypothesis (based on prior fix TASK-004):** The same CJK-suppression bug from PR #68 may affect `/youtube-insights` too. `key_insight` values stored in Chinese get suppressed when the frontend locale is `en`, resulting in empty/null display while the DB still has content.
  
  **Diagnosis steps:**
  1. Run `SELECT id, key_insight, locale, video_id FROM app.youtube_insight WHERE key_insight IS NULL OR key_insight = ''` — count empty rows vs total.
  2. Run `SELECT id, key_insight, locale, video_id FROM app.youtube_insight WHERE key_insight IS NOT NULL AND locale = 'zh'` — count Chinese rows that would be suppressed under EN locale.
  3. Check the frontend card component at `/youtube-insights` — does it filter out non-EN insights similarly to how the homepage insight card did?

  **Fix:**
  1. **Backend guard** — Add `WHERE key_insight IS NOT NULL AND key_insight != ''` to the `/api/youtube-insights` query. This prevents DB-null rows from reaching the frontend at all.
  2. **Client-side fallback** — For rows that have a `key_insight` but get suppressed by locale logic, add a fallback display: if `key_insight` is falsy after suppression, render the raw video title or description snippet instead, with a small "Auto-generated" label.
  3. **Alternative (if CJK-suppression is the cause):** Remove the locale-based suppression entirely for the insight text field on `/youtube-insights`, letting all insights render regardless of locale (they're already in the user's language context via the video).
  4. **Edge case** — If a video has truly no analysis (DB null + no title/desc available), show "Analysis pending" with a muted style.
  
  **Visual:** Card should always feel complete — at minimum a video title/thumbnail, a text block (either AI insight or fallback), and the sentiment/label. No skeleton-with-empty-slot states.

---

## [2026-06-28] TASK-004: Product rename — "Product Tracer" → "OpenProduct"
- **Priority**: P0
- **Status**: ready
- **Locked by**:
- **Locked at**:
- **Acceptance**: All references to "Product Tracer" throughout the codebase are changed to "OpenProduct". Site title, nav bar, page titles, meta tags, OG images, README, CHANGELOG.
- **Spec**:
  **Scope — exhaustive grep & replace:**
  1. **Site metadata** — Update `app/layout.tsx` (or root layout): `<title>`, `<meta name="description">`, Open Graph `<meta property="og:title/description">`, Twitter card tags. Change "Product Tracer" → "OpenProduct" in all.
  2. **Nav bar** — Find the nav/sidebar component (likely `app/components/Navbar.tsx` or similar). The site brand/logo text "Product Tracer" → "OpenProduct". Update any `aria-label` or `title` attributes.
  3. **i18n strings** — Search `messages/` or `locales/` for translation keys containing "Product Tracer". Update EN values to "OpenProduct"; keep ZH translation consistent (建议：将"产品追踪器"改为"OpenProduct"品牌名，或译为"开放产品").
  4. **Page titles** — Every page/layout that sets `<title>` or `h1` with "Product Tracer": `/dashboard`, `/projects`, `/youtube-insights`, `/trends`, `/bookmarks`, `/settings` (if exists).
  5. **OG images** — If there's a dynamic OG image generation route (e.g., `/og/youtube-insights`), update the rendered text overlay.
  6. **Documentation** — `README.md` (project title, description, badges), `CHANGELOG.md` (header), any doc files under `docs/` or `doc/`.
  7. **Filename / package name** — Check `package.json` for `"name"` or `"description"`, `.env.example` comments, any Dockerfile comments.
  8. **Search / meta** — `/robots.txt`, `/sitemap.xml` (if auto-generated, verify output includes new brand name).
  9. **Favicon / manifest** — `app/favicon.ico` and `manifest.json` `"name"` / `"short_name"`.
  
  **Rollout strategy:**
  - Create branch `rename-openproduct`.
  - Use `rg "Product Tracer" --files-with-matches` to find all files first, then batch-replace with `sed` / manual review.
  - Do NOT change database table names, column names, or API routes (those remain stable). Only user-facing text and documentation.
  - Verify: `rg "Product Tracer" --ignore-case` returns 0 matches after the change.
  - After merge, verify deployed site shows "OpenProduct" everywhere on the frontend.

---

## [2026-06-28] TASK-005: Landing page — "OpenProduct" marketing homepage
- **Priority**: P0
- **Status**: ready
- **Locked by**:
- **Locked at**:
- **Acceptance**:
  - A new landing page at `/` with flashy animations/effects that sells the product
  - Tagline: "Stay ahead of the curve. Discover the latest products building around the world."
  - "Get Started" CTA button → login/signup
  - After login → redirect to the existing product dashboard (the current `/` page moves to `/dashboard`)
  - Must be bilingual (EN/ZH), include i18n keys
  - Visually impressive — animated hero, gradient effects, particle effects or similar
- **Spec**:
  **Route architecture:**
  1. Current `/` (product dashboard) moves to `/dashboard`. Update all internal links, nav bar "Home" link, and auth redirects accordingly.
  2. New landing page at `app/page.tsx` (or appropriate route) renders the marketing homepage.
  3. After authentication (Supabase auth callback / `onAuthStateChange`), redirect to `/dashboard` instead of `/`.
  
  **Landing page content & layout:**
  
  **Hero section (above the fold):**
  - Large animated headline: "OpenProduct" (branded) + tagline "Stay ahead of the curve."
  - Subheadline: "Discover products building around the world, tracked daily by AI."
  - CTA button: "Get Started →" → `/login` (Supabase auth). If already logged in, redirects to `/dashboard`.
  - Background: animated gradient mesh or particle system (use `framer-motion` or CSS `@keyframes`). Subtle floating particle dots or grid lines.
  
  **Feature section (3-column):**
  - **AI-Powered Discovery** — "Every product is analyzed by AI, summarized, and categorized. No manual curation needed."
  - **Daily Updates** — "New products tracked every 2 hours. See what's building in real-time across GitHub and Reddit."
  - **Smart Insights** — "Browse by category, score, tags, or trends. Find the needle in the haystack."
  
  **Social proof / stats strip:**
  - "4,500+ products tracked" / "3,900+ AI summaries" / "Updated every 2 hours" — use real counts from DB.
  
  **Footer:**
  - Brand name "OpenProduct © 2026" + minimal links (GitHub repo, About).
  
  **Technical implementation:**
  - Use `framer-motion` for scroll-triggered animations (fade-in sections on scroll).
  - Hero background: CSS gradient animation (`linear-gradient` with `@keyframes` shifting hue/angle) + optional `react-tsparticles` or canvas particle effect.
  - Responsive: stacked on mobile, side-by-side on tablet/desktop.
  - i18n: define EN/ZH keys in the existing i18n system for every text string on the page.
  - Performance: keep JS bundle light — lazy-load particle effect if used. Above-fold content should be plain CSS-animated.
  
  **Event tracking:**
  - Add a `data-cta="landing-get-started"` attribute on the CTA button for future analytics.

---

## Done Tasks

## [2026-06-27] TASK-000: User Auth + Synced Bookmarks
- **Priority**: P0
- **Status**: done
- **PR**: #77
- **Verify**: PASS — all pages 200, auth flow works
