# Bug Reports

> Automated browser test + human-like product tour - 2026-06-25 06:05 UTC
> Tester: JBK (Product Manager + QA Lead)

---

## B1 - Raw i18n key on homepage insights section

**Reported:** 2026-06-24T14:00Z
**Severity:** P3 (Minor)
**Page:** `/` (Homepage)

**Description:** The Insights "View all" link in the homepage Insights section displays the raw i18n key `home.section.insights.viewAll` instead of "View all" or similar localized text. This is a translation interpolation issue — the key is not being resolved by the i18n provider.

**Reproduction:** Open https://product-tracer.vercel.app/. Scroll down to the Insights section (heading with YouTube icon). The link next to "Fresh takeaways from across YouTube" reads `home.section.insights.viewAll` instead of a localized text like "View all".

**Expected:** The i18n key `home.section.insights.viewAll` should resolve to a human-readable label (e.g., "View all" in English, "查看全部" in Chinese).

---

## B2 — Mobile tap targets below AAPL 44px guideline

**Reported:** 2026-06-25 06:10 UTC
**Severity:** P3 (Minor)
**Page:** `/` (Homepage)
**Device:** iPhone 12 Pro / 390px viewport

**Description:** Several interactive elements have tap targets smaller than the recommended 44×44px minimum:

- "Tracking across" platform badges (GitHub, Hacker News, Product Hunt, YouTube) — ~26px height with 2px <gap>
- Language toggle buttons (EN, ZH toggle) — the <div role="group"> wrapper flows inline, each button is roughly 20×28px
- Theme toggle button — 28×28px total from 7×7w-7 h-7
- Nav link "All projects" — 14px line-height, ~16px actual tap target
- "Daily email digest" text — not a button/link but appears to be interactive; only ~14px tall if so

**Expected:** All interactive elements should have at least 44×44px tap targets (Apple HIG). For inline elements, use increased padding or invisible hit area extensions.

---

## B3 - No `<title>` on `/projects` page (empty <title>)

**Reported:** 2026-06-25 06:10 UTC
**Severity:** P2 (Medium)
**Page:** `/projects`
**Device:** All

**Description:** `<title>` element exists but its content is empty. Matters for a11y (screen readers), SEO, and tab management (browser tab shows blank text). Only shows the Next.js `<title>` tag with missing or empty content.

**Note:** This may be a hydration issue or missing metadata export.

---

## B4 - `/favicon.ico` returns 404

**Reported:** 2026-06-27 00:30 UTC
**Severity:** P3 (Minor)
**URL:** `https://product-tracer.vercel.app/favicon.ico`

**Description:** No favicon configured. Request returns `404: This page could not be found.` on every page load. Browser tools show a 404 in the console for `/favicon.ico`.

---

## B5 — Pervasive undersized tap targets on /projects at 375px

**Reported:** 2026-06-26 21:00 UTC
**Severity:** P3 (Minor)
**Page:** `/projects`
**Device:** 375px viewport

**Description:** At 375px viewport width, the individual project card tap targets are approximately 375px × ~80px, which is above the 44px minimum. However, several interactive elements within the cards fall below the threshold:
- Tag filter buttons (~28px height)
- Sort dropdown (~32px height)
- Platform filter chips (~26px height)
- Pagination buttons (~32px height)

**Expected:** All interactive elements should have at least 44×44px tap targets (Apple HIG).

---

## B6 - WoW product name case mismatch in /trends comparison cards

**Reported:** 2026-06-27 08:10 UTC
**Severity:** P4 (Cosmetic) - minor data presentation inconsistency
**Page:** `/trends`

**Description:** The "This week" and "Last week" comparison cards in the Week Over Week section show the same top product with different casing:
- This week: **"Are You in the Weights?"** (title case)
- Last week: **"Are you in the Weights?"** (lowercase 'y' in "you")

This is a data quality issue — the product name likely comes from two different source snapshots with inconsistent casing.

**Reproduction:** Visit `/trends`, look at the Week Over Week section. The top product name on the "This week" card has "You" capitalized while "Last week" shows "you" lowercase.

**Expected:** Product names should be normalized to consistent casing across all data sources before display. Consider adding a DB-level name normalization on ingest.

---

## B7 — Hero badge vs stat card project count discrepancy

**Reported:** 2026-06-27 18:00 UTC
**Severity:** P3 (Minor)
**Page:** `/` (Homepage)

**Description:** Two different project count values are displayed on the same page:
- Hero badge: **"4,790 projects tracked across 4 platforms"**
- Stat card (Total projects): **"5.2k"** (~5,200)

The difference is ~410 projects (8.6% discrepancy). While it's possible one source counts "total indexed projects" and the other counts "currently tracked across 4 platforms", the badge copy says "projects tracked" which semantically conflicts with "Total projects" on the stat card. Either the badge copy should change (e.g., "This week's active projects") or the data sources should be unified.

**Reproduction:** Visit `/`, observe the hero badge (~4,790) vs the "Total projects" stat card (5.2k).

**Expected:** Either unify to a single data source, or make the badge copy descriptive enough to explain the difference (e.g., "4,790 projects updated this week").
