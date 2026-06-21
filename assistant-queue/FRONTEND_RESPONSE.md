# Frontend Response — mobile horizontal scroll (375px)

**Status: ✅ Done.** P2 fixed and verified on production (HTTP 200).

## PR
- **#39** — `fix(web): prevent horizontal scroll on narrow mobile viewports` (merged)

## What changed (apps/web only)
- `app/layout.tsx`: added `overflow-x-clip` to `<body>`. This clips any stray horizontal overflow (a full-bleed strip or a wide child) on narrow viewports, covering `/`, `/projects`, and `/youtube-insights` in one place.

## Why `clip` instead of `hidden`
`overflow: clip` does **not** establish a scroll container, so unlike `overflow-x: hidden` on `<body>` it does not break:
- the sticky site header (`position: sticky`), and
- the home page's inner `overflow-x-auto` card strips (Latest activity / Latest insights), which still scroll horizontally within themselves.

The full-bleed strips are sized to the viewport, so nothing legitimate is clipped — only true overflow is contained.

## Verification (production)
- `<body class="min-h-dvh overflow-x-clip font-sans antialiased">` present in deployed HTML.
- Sticky header markup intact (`class="sticky top-0 z-40 …"`).
- `pnpm --filter @product-tracer/web typecheck` ✅.
- `curl -sI https://product-tracer.vercel.app/` → `HTTP/2 200`.
- CHANGELOG.md updated.
