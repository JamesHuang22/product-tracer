# Response: Mobile Horizontal Scroll Fix — 🔴 SCOPE MISMATCH

Date: 2026-06-22
Agent: backend (subagent)
Status check: 2026-06-22 12:30 PDT

## Summary

This task cannot be completed by a backend agent. The horizontal scroll on `/` at 375px viewport is a **frontend CSS/rendering issue** that requires changes to `apps/web/`, which the backend rules explicitly forbid.

**Recommended action:** Re-route to `FRONTEND_REQUEST.md` or assign a frontend agent.

---

## Investigation findings

### 1. PR #39's fix is still in effect

Commit `2ca9892` (`fix(web): prevent horizontal scroll on narrow mobile viewports (#39)`) is merged to `main` and its changes are present:

**`apps/web/app/layout.tsx`** line 31:
```tsx
<body className="min-h-dvh overflow-x-clip font-sans antialiased">
```

The `overflow-x-clip` CSS class is applied to `<body>`. This should prevent any child overflow from causing horizontal scroll. The comment in the source even documents the deliberate choice of `clip` over `hidden` to avoid breaking sticky header behavior.

**However**, `overflow-x-clip` on `<body>` only prevents *body-level* scroll. If any *ancestor* of the body (i.e., `<html>`) has overflow, or if there is an absolutely/fixed-position element protruding, or if there's a CSS grid/container that overflows at exactly 375px, the scroll can return.

### 2. The bug was re-added to REQUEST.md recently

Commit `997797f` (2026-06-22 08:56) re-created `REQUEST.md` with the same task description, even though:
- Commit `acd2243` (2026-06-21 20:52) had cleared it, noting "mobile scroll already fixed".
- The original bug was previously re-routed from backend→frontend (commit `a7f7716`, "reroute mobile scroll bug from backend→frontend (CSS issue)").

### 3. This is a regression investigation, not a backend task

The fix at the backend layer (`apps/worker/`, `packages/`, `.github/workflows/`) cannot address horizontal scroll on the web homepage. This is purely a frontend rendering concern:

- **Possible causes of regression:**
  - A component merged since PR #39 that uses `position: absolute`/`fixed` with a wide child
  - A CSS grid or flex layout that doesn't constrain width at 375px
  - Something in React/Next rendering that causes a scrollable child element
  - A browser-specific rendering quirk with `overflow-x-clip` on `<body>` and certain child layouts

### 4. Prior precedent

Commit `a7f7716` already documented this exact realization: the mobile scroll bug was previously rerouted from backend→frontend because it's a CSS issue. The current REQUEST.md appears to be a regression back to the wrong queue.

---

## What a frontend agent should investigate

1. **Check if `<html>` also has overflow** — `overflow-x-clip` on `<body>` is insufficient if `<html>` naturally overflows.
2. **Inspect CSS at 375px** — look for any `min-width`, `width` > 375px, `position: absolute/fixed` offsets, or negative margins.
3. **Check `SiteHeader` component** — a full-bleed strip or fixed-position header could cause overflow.
4. **Verify `children` content** — check what's rendered in the homepage layout at `/` (likely `app/page.tsx` and its sub-components).
5. **Add `overflow-x-clip` to `<html>` as well** — this is a common belt-and-suspenders approach:
   ```css
   html { overflow-x: clip; }
   ```
6. **Use `max-width: 100vw` on any full-bleed containers** — ensure no element exceeds viewport width.

---

## Files that need touching (out of scope for backend)

- `apps/web/app/globals.css` — add `html { overflow-x: clip; }`
- `apps/web/app/page.tsx` — inspect homepage content for overflow sources
- `apps/web/components/site-header.tsx` — check for absolute/fixed positioning issues
- Any component rendering full-bleed content on `/`

---

## Recommendation

1. Move this task from `REQUEST.md` (backend queue) to `FRONTEND_REQUEST.md` (frontend queue).
2. Add `html { overflow-x: clip; }` as a belt-and-suspenders measure to `globals.css`.
3. If the bug persists, inspect components rendered on `/` at 375px for layout overflow.
4. Update `doc/feature-note.md` to reflect the scope mismatch finding.

---

## Audit trail

- Current `REQUEST.md` re-created by commit `997797f` on 2026-06-22
- Original fix: PR #39 (`2ca9892`) — `overflow-x-clip` on `<body>`
- Previous reroute: commit `a7f7716` — backend→frontend
- Previous clear: commit `acd2243` — "mobile scroll already fixed"
- Latest browser test (commit `997797f`): still reports the bug
