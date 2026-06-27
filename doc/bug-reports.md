# Bug Reports

> Automated browser test + human-like product tour — 2026-06-25 06:05 UTC
> Tester: JBK (Product Manager + QA Lead)

---

## B3 — YouTube Insights cards with missing AI summary text

**Reported:** 2026-06-27 07:30 UTC  
**Severity:** P3 (Minor) — degraded user experience, missing content  
**Page:** `/youtube-insights`

**Description:** Several video insight cards render with `null` children in the `<p>` content element, meaning no AI summary text is displayed. The card only shows the sentiment indicator, category badge, and YouTube link — the main body content is blank.

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

## B1 — Raw i18n key on homepage insights section

**Reported:** 2026-06-27 00:30 UTC  
**Severity:** P3 (Minor) — cosmetic, visible to users  
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

## B4 — `/favicon.ico` returns 404

**Reported:** 2026-06-27 00:30 UTC  
**Severity:** P3 (Minor)  
**URL:** `https://product-tracer.vercel.app/favicon.ico`

**Description:** No favicon configured. Request returns `404: This page could not be found.` on every page load. Browser tools show a 404 in the console for `/favicon.ico`.
