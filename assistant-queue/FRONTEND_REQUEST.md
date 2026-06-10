# Assistant Queue — Alex → Claude Code (Frontend)

## Task: Remove Reddit and X "Coming Soon" sections from home page

### Background
The home page (`apps/web/app/page.tsx` + `apps/web/components/platform-section.tsx` + `apps/web/components/home-content.tsx`) currently shows Reddit and X as "Coming Soon" platform cards. These collectors are not active and the placeholder looks unprofessional. Remove them.

### What to do

**1. Home page** (`apps/web/app/page.tsx`)

- Remove the Reddit and X counts from `totalLive` calculation (currently `comingSoon: 2`)
- Remove the `comingSoon` prop from `<HomeContent>` — it's no longer needed
- Also update the `livePlatforms` count down from 4 to 4 (it's already correct — just the 4 live ones)
- Remove `reddit` and `x` imports / references if any

**2. Home content component** (`apps/web/components/home-content.tsx` — likely named)

- Find and remove the section that renders "Coming Soon" cards for Reddit and X
- If there's a separate rendering path that checks `data.reddit` or `data.x`, remove those checks
- Make sure the platform section grid doesn't have Reddit/X gaps

**3. i18n** (`apps/web/lib/i18n.ts`)

- Remove the `'platform.name.reddit'` and `'platform.name.x'` translation keys IF they only existed for the Coming Soon section
- Keep them if they're used elsewhere (e.g. /projects table platform badges)

**4. Platform page** (`apps/web/app/platform/[platform]/page.tsx`)

- The `PLATFORMS` array includes `'reddit'` and `'x'` — leave those, they're for direct URL access (we still have the data model, just no active collector). Only remove the home page sections.

### Files to touch (ONLY apps/web/)
- `apps/web/app/page.tsx` — remove comingSoon, adjust counts
- `apps/web/components/home-content.tsx` — remove Coming Soon card rendering
- `apps/web/lib/i18n.ts` — maybe, if keys are removable

### DO NOT touch
- Any file in `apps/worker/`, `packages/`, `.github/workflows/`, migration `.sql`, `research/`

### Verification
- Home page no longer shows "Coming Soon" for Reddit or X
- Layout is clean — no empty gaps where the sections were
- `/platform/reddit` and `/platform/x` URLs still work (they should — collectors may come later)
- `pnpm typecheck` passes

---

Execute. Write FRONTEND_RESPONSE.md when done.
