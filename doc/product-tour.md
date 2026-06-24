# Product Tour: Homepage Focus

> Date: 2026-06-23 (PST) | Focus: Homepage first impression, click-through, scroll, speed

## Summary

**Critical findings**: The site is partially down — homepage, /trends, and /youtube-insights all return HTTP 500. The /projects page returns 500 HTTP status but successfully serves content. Project detail pages load (HTTP 200) but show a client-side error. This run's findings override the "0 bugs" report from the automated tests — the automated test returned 0 bugs because it only checks Puppeteer-level metrics, not HTTP status codes.

See [doc/bug-reports.md](./bug-reports.md) for detailed reproduction steps.

## Bugs (3 P0 + 1 P2)

See doc/bug-reports.md for full details. Quick summary:
- **P0** — Homepage HTTP 500 (server-side exception)
- **P0** — /youtube-insights blank/empty
- **P0** — /trends HTTP 500
- **P2** — Project detail pages show client-side exception

## Tour Notes

### Structure Working
- **Navigation**: All 5 nav items render (Projects, Insights, Trends, Bookmarks)
- **/projects**: 100+ project links load, search works (finds 120 results for "ai")
- **Mobile 375px**: No horizontal overflow, scroll works
- **Trends heading**: "Weekly Hot Trends" renders (but HTTP 500)

### Structure Broken
- **Homepage**: Error message only (no value prop, no project cards, no insights)
- **YouTube Insights**: Empty page — 0 cards, 0 YouTube links, no heading
- **Trends content**: 5 products shown but HTTP status is 500
- **Project detail**: Client-side exception after successful load
