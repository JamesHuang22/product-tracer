# Frontend Response — language auto-detect, dark mode, projects sort, RSS

**Status: ✅ Done.** All 4 features shipped and verified on production (HTTP 200).

## PR
- **#38** — `feat(web): language auto-detect, dark mode, projects sort, RSS feeds` (merged)

## What shipped (apps/web only)

### 1. First-visit language auto-detection — `lib/i18n-context.tsx`
When no locale cookie is set and `navigator.language` is Chinese, switch to 中文 and persist it. **Implemented as a mount `useEffect`, not the `useState` initializer in the sketch** — `navigator` is client-only, so the initializer would cause an SSR/hydration mismatch. An explicit prior choice (any locale cookie) is always respected.

### 2. Dark-mode toggle — new `components/theme-toggle.tsx` + `site-header.tsx` + `layout.tsx` + `globals.css`
Sun/moon button in the header; persists `localStorage.theme`. Inline no-flash script in `layout.tsx` applies the theme before first paint (`<html suppressHydrationWarning>`). Tailwind v4 `dark:` made class-based via `@custom-variant dark (&:where(.dark, .dark *))`, and bg/fg vars follow `.dark`.

### 3. Sort dropdown on `/projects` — `projects-table.tsx`
Stars ↓ (default) / Stars ↑ / Newest first / Name A–Z, beside the category filter. Drives the existing client-side tanstack sort (hidden `created_at` column powers "Newest"). **Done client-side, not via query params/SQL** — the `db.ts` functions don't actually take sort params (the request assumed they did) and the table already sorts in-browser, so no DB changes were needed.

### 4. RSS feeds — new `app/feed/projects.xml/route.ts` + `app/feed/youtube-insights.xml/route.ts`
RSS 2.0, `Content-Type: application/xml`, XML-escaped, `force-dynamic`, CDN-cached. `<link rel="alternate" type="application/rss+xml">` autodiscovery added via `metadata.alternates`.

i18n: added `sort.*` + `theme.*` keys (EN + ZH).

## Verification (production)
- `curl -sI /` → `HTTP/2 200`.
- No-flash theme script + RSS autodiscovery `<link>` present in `/`; ThemeToggle button (`aria-label="Switch to dark mode"`) in header.
- `/feed/projects.xml` & `/feed/youtube-insights.xml`: 200, `application/xml; charset=utf-8`, 50 `<item>`s each, **well-formed XML** (`xmllint --noout` passes).
- `/projects` shows all four sort options (Stars high/low, Newest first, Name A–Z).
- `pnpm --filter @product-tracer/web typecheck` ✅ and local `next build` ✅ (lint clean).
- CHANGELOG.md updated.
