# Product Tour: 2026-06-24T03:50 PST (Focus: Homepage + Quick sanity)

## Summary

Site health: ✅ **All routes recovered.** Previously all routes returned HTTP 500; now they all return 200.

| Route | Status | Notes |
|-------|--------|-------|
| `/` | 200 | Load ~4.9s. H1 "Cross-platform signals for indie products." Navigation: Projects, Insights, Trends, Bookmarks. 4,434 projects, 4 platforms. Stats cards, project grid, insights section, trends section. |
| `/projects` | 200 | 56 project elements visible. Search input present, category filter present, bookmark buttons on rows. Tag chips not detected via selectors. |
| `/projects/speakup` | 200 | Breadcrumb ✅, AI summary ✅ ("SpeakUp is a voice control tool for macOS…"), Related projects ✅ (4 same-category), Bookmark button ✅, Tags (#macos, #voice-control, etc.) |
| `/trends` | 200 | Week label present, top products, WoW comparison, bar chart. |
| `/youtube-insights` | 200 | Title, grid/list toggle, category chips, insight cards rendering. |
| `/bookmarks` | 200 | Page loads. |
| `/api/search?q=ai` | 200 | Works. |

Bugs found: **0 new**. Favicon 404 is the only console/resource error — a known P2. The previous P0 site-wide 500 regression is fully resolved.

**Previously reported bugs still open:**
- P2: Favicon 404 on every page
- P2: ZH locale i18n leak (~9144 EN vs 146 ZH chars on /projects)
- P2: Breadcrumb / Related projects — confirmed fixed on `/projects/speakup` (T1+T6 shipped)

**Queue**: REQUEST.md has content (BUG-1 empty insight card, FEAT-1 historic weeks selector, FEAT-2 collector improvements). Do NOT overwrite.
