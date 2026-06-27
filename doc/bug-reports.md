# Bug Reports

> Automated browser test + human-like product tour - 2026-06-25 06:05 UTC
> Tester: JBK (Product Manager + QA Lead)

---

## B3 - YouTube Insights cards with missing AI summary text

**Reported:** 2026-06-27 07:30 UTC
**Severity:** P3 (Minor) - degraded user experience, missing content
**Page:** `/youtube-insights`

**Description:** Several video insight cards render with `null` children in the `<p>` content element, meaning no AI summary text is displayed. The card only shows the sentiment indicator, category badge, and YouTube link - the main body content is blank.

**Affected cards (from HTML inspection):**
- `xw1O9DTAQrs` (AI/ML, Neutral)
- `y2bZdXZBeBc` (Other, Positive)
- `b-6T46BBlcs` (Tech News, Negative)
- `D3Hhp7HVBuQ` (Tech News, Neutral)
- `4jMoZictT0s` (Other, Neutral)

**Reproduction:** Visit `/youtube-insights` and scroll through the list. Cards without text show only the footer (sentiment + category + YouTube link).

**Root cause (suspected):** LLM analysis returned an empty/falsy summary for these videos, and the component renders `false` instead of a fallback text like "No summary available" or the raw video title.

**Expected:** Cards without generated summaries should show a fallback label (e.g., "Summary pending" or the raw video title) instead of an empty content area.

---

## B1 - Raw i18n key on homepage insights section

**Reported:** 2026-06-27 00:30 UTC
**Severity:** P3 (Minor) - cosmetic, visible to users
**Page:** `/` (homepage)

**Description:** The Insights section on the homepage displays `home.section.insights.viewAll` as visible text instead of a localized label. This is an untranslated i18n key leaking into the UI.

**Location:** Insights section card strip, likely in the section header or CTA link.

**Reproduction:** Visit homepage. Look for the Insights section — the "view all" link or section heading will show the raw key.

---

## B2 — Mobile tap targets below AAPL 44px guideline

**Reported:** 2026-06-27 00:30 UTC
**Severity:** P4 (Cosmetic)
**Page:** All pages at 375px viewport

**Description:** At 375px (iPhone SE/12/13/14), the dark mode toggle is `h-7 w-7` (28px) and the hamburger menu is `h-8 w-8` (32px). Apple's HIG recommends minimum 44×44 tap targets.

---

## B5 — Pervasive undersized tap targets on /projects at 375px

**Reported:** 2026-06-27 10:30 UTC
**Severity:** P3 (Minor) — usability issue on mobile
**Page:** `/projects`, `/` (homepage) at 375px viewport

**Description:** At 375px (iPhone SE/12/13/14), nearly all interactive elements on `/projects` and the homepage sections are below the 44×44px HIG minimum:

- **Category tag badges**: 23px tall (`#self-hosted`, `#ai`, `#cli`, `#llm`, etc.) — too small to reliably tap
- **"View all X projects" links**: 16px tall — extremely difficult to tap
- **Pagination "Prev" / "Next" buttons**: 26px tall — below minimum
- **Brand "Product Tracer" link**: 20px tall in nav
- **"Full report" link (homepage)**: 16px tall
- **Each section's "View all" link**: 16px tall

**Reproduction:** Open the site on a 375px viewport (iPhone). Visit `/projects` or scroll through the homepage. Attempt to tap category tags, "View all" links, or pagination buttons.

**Expected:** All interactive elements should have at least 44×44px tap targets (Apple HIG). For inline elements, use increased padding or invisible hit area extensions.

---

## B4 - `/favicon.ico` returns 404

**Reported:** 2026-06-27 00:30 UTC
**Severity:** P3 (Minor)
**URL:** `https://product-tracer.vercel.app/favicon.ico`

**Description:** No favicon configured. Request returns `404: This page could not be found.` on every page load. Browser tools show a 404 in the console for `/favicon.ico`.

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
