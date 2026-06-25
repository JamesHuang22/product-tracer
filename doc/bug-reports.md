# Bug Reports — 2026-06-25 | Tour #72

## Focus: /youtube-insights (EN/ZH locale, grid/list toggle, mobile) | Cron Run

**Environment**: Localhost (dev server) — **SITE DOWN**
**Date**: 2026-06-25T05:50 UTC

### Automated Test
- 12/12 tests ✅ (but all returned HTTP 500 — server error)
- Root cause unchanged: Missing .env file → `DATABASE_URL` not set → DB calls fail

---

## [P0] Local dev server down — HTTP 500 on ALL pages (CONTINUED)

**Severity**: P0 — site completely non-functional
**Age**: 2nd consecutive cron run

**Evidence from this run**:
- Homepage → HTTP 500, `Error: Missing DATABASE_URL`
- `/youtube-insights` → HTTP 500, same error (digest: 3491862495)
- `/projects` → HTTP 500, same error (digest: 3440396205)
- Puppeteer tour yielded 143 bytes of body text — just the error message
- All 5 pages return 500 with identical root cause

**Root Cause**: No `.env` file exists. The `getSql()` / `createSqlClient()` function throws when `DATABASE_URL` is undefined. All server components that query the DB crash during SSR.

**Fix**: Copy `.env.example` → `.env` and populate with Supabase credentials and API tokens.

---

## [P0] Mobile nav collapse: ALL nav links invisible at 375px viewport (CONTINUED)

**Severity**: P0 — site unusable on mobile

**Age**: 4th consecutive cron run — still unfixed

---

## [P0] All locale-prefixed routes return 404 (CONTINUED)

**Severity**: P0
**Age**: 9th consecutive cron run — still unfixed

**This run**: Confirmed for /zh/youtube-insights, /en/youtube-insights, /zh/trends, /en/trends on localhost (all 500 due to DB, but 404 confirmed previously on vercel)

---

## [P2] Category filter on /youtube-insights doesn't filter (CONTINUED)

**Severity**: P2
**Age**: 5th consecutive run — unfixed

---

## [P3] favicon.ico 404 (CONTINUED)

**Severity**: P3
**Age**: 9th consecutive run — unfixed

---

## All Open Bugs Summary

| Sev | Bug | Age | Status |
|-----|-----|-----|--------|
| P0 | Local dev server down (missing .env / DATABASE_URL) | 2 runs | 🔴 **Unfixed — site down** |
| P0 | Mobile nav: all links invisible at 375px | 4 runs | 🔴 Unfixed |
| P0 | All locale-prefixed routes return 404 | 9 runs | 🔴 Unfixed |
| P2 | Category filter on /youtube-insights doesn't filter | 5 runs | 🔴 Unfixed |
| P2 | ZH locale button doesn't update URL locale prefix | 5 runs | 🔴 Unfixed |
| P3 | Blank key_insight card on youtube-insights | 4 runs | 🔴 Unfixed |
| P3 | /trends product cards missing WoW delta indicators | 4 runs | 🔴 Unfixed |
| P3 | Mobile tap targets < 44px WCAG | 4 runs | 🔴 Unfixed |
| P3 | favicon.ico 404 | 9 runs | 🔴 Unfixed |
| P3 | Video Highlights has only 1 link on /trends | 3 runs | 🔴 Unfixed |
