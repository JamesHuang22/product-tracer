# OpenProduct — Development Queue

---

## [2026-06-28] TASK-012: Refine /dashboard UI — more professional, cleaner, elevated
- **Priority**: P1
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-28 22:55 PDT
- **PR**: #90 (merged)
- **Verify**: PASS — /dashboard 200 with polished markup live (StatCard ring+shadow, hero leading-[1.05]/tracking-[-0.02em], section dividers, hover-lift cards, snap strips, loading.tsx skeleton). Palette/layout/data/i18n unchanged; /, /projects, /trends, /youtube-insights all still 200.
- **Acceptance**: The /dashboard page looks more polished and professional while keeping the same general style/color scheme. Better spacing, typography, visual hierarchy, loading states, responsive layout.
- **Spec**:
  **Goal:** Elevate `/dashboard` from functional to polished without changing its color palette, layout structure, or component library (Tailwind + shadcn vibes). Think Stripe/Linear-level attention to detail.

  **Files to touch:**
  - `apps/web/app/dashboard/page.tsx` — server component, data fetching stays
  - `apps/web/components/home-content.tsx` — all UI lives here

  **Specific improvements:**

  1. **Typography refinement**
     - Hero headline: keep 4xl/5xl; add `leading-[1.05]` for tighter wrap, `tracking-[-0.02em]` for premium feel
     - Section headers (`h2`): from `text-xl` → `text-lg font-semibold tracking-tight`; reduce subtitle `text-sm` → `text-xs` with `text-neutral-400`
     - Stats cards: value text `text-2xl` → `text-xl font-bold tabular-nums`; label `text-[11px]` stays but add `tracking-wider`; reduce card padding from `p-4` → `p-3.5`
     - Body text everywhere: increase `leading-relaxed` → `leading-[1.6]` for readability

  2. **Spacing & rhythm**
     - Reduce `mt-16` sections → `mt-14` (still enough breathing room, tighter on tall screens)
     - Cards inside `LivePlatformSection` and `LatestCard`: `p-4` → `p-3.5`, `gap-1.5` → `gap-1` inside cards
     - Hero section: from `py-12 sm:py-16` → `py-10 sm:py-14`; badges and hero text already good
     - Stats grid: reduce `mt-12` → `mt-10`, `gap-3` → `gap-2.5`

  3. **Visual hierarchy & details**
     - Add subtle `shadow-sm` to cards on light mode, `ring-1 ring-black/5` instead of full `border` for slightly softer outlines
     - StatCards: change `border-neutral-200` → `ring-1 ring-neutral-200/60` with `shadow-[0_1px_2px_rgba(0,0,0,0.04)]`; same for dark
     - Add `transition-all duration-200` on card hover instead of just `transition-colors`; include `-translate-y-0.5` lift on hover
     - Section headers: add a thin divider line below them (`border-b border-neutral-100 pb-4 mb-5`, dark: `border-neutral-800`) for clear visual separation
     - Hero badge: `bg-neutral-50` → `bg-white dark:bg-neutral-900` with `shadow-sm`, `text-xs` → `text-[11px]`

  4. **Loading/skeleton states**
     - Already `force-dynamic` and server-fetched, so there's no client-side loading within the page. Add a minimal `loading.tsx` at `apps/web/app/dashboard/loading.tsx`:
       - Same `<main>` wrapper, `max-w-6xl`
       - Skeleton placeholder: `animate-pulse` 
       - Hero badge skeleton: `h-5 w-40 rounded-full bg-neutral-100`
       - Headline skeleton: `mt-5 h-10 w-3/4 rounded-md bg-neutral-100`, `mt-2 h-10 w-1/2 rounded-md bg-neutral-100`
       - Stats grid: 4 `h-20 rounded-xl bg-neutral-100` cards in a `grid grid-cols-2 sm:grid-cols-4 gap-3`
       - Use `<div>` skeletons with `bg-neutral-100 dark:bg-neutral-800` — no animation lib needed

  5. **Responsive polish**
     - `px-6` → `px-5 sm:px-8 lg:px-6` on main (tighter on mobile, wider on tablet)
     - Latest/Insights horizontal scroll: add `snap-x snap-mandatory scroll-pl-6` so cards snap to start on mobile
     - Add `scrollbar-hide` class (Tailwind plugin already installed or use `[-ms-overflow-style:none] [scrollbar-width:none]`) on horizontal scroll containers

  **Keep unchanged:**
  - Entire color palette (emerald badges, neutral grays, platform colors)
  - Layout column/row structure — 4-col stats grid, 2-col platform grid, horizontal scroll strips
  - All i18n keys and locale logic
  - Platform badges, category badges, sentiment dots
  - Data fetching and data shapes

  **Don't do:**
  - Don't add full-page animations, framer-motion, or complex transitions (stays lean)
  - Don't rearrange component hierarchy (data flows stay as-is)
  - Don't touch `/projects`, `/trends`, or other pages

---

## [2026-06-28] TASK-013: User-submitted products — form, AI review, "Recently Submitted" category
- **Priority**: P0 FEATURE
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-28 23:10 PDT
- **PR**: #91 (merged)
- **Verify**: PASS — migration 0018 applied (app.user_submission exists, RLS on, 1 row). Pages: / 200, /projects 200, /projects?category=recently-submitted 200, /submit & /account 307→/login (auth-gated as specced). All 8 parts shipped: DB table, AI review worker (apps/worker/src/scripts/submission-review.ts + .github/workflows/submission-review.yml), db.ts queries, recently-submitted category + i18n, /submit form, /api/submit-product route, site-header Submit link, /account submission history.
- **Acceptance**: Users can submit their own product via a form (requires login). AI reviews the submission (validates GitHub URL, product URL, description). Valid entries appear in "Recently Submitted by Developers" category on /projects. Invalid entries marked in DB.
- **Spec**:
  **Overview:** Add a new DB table + API + frontend form so logged-in users can submit their own product. An AI validation step reviews submissions. Valid submissions appear in a new "Recently Submitted by Developers" category on `/projects`. Invalid submissions get marked (not deleted) for admin review.

  **Part 1 — DB Migration**
  New file: `packages/db/migrations/0018_user_submission.sql`
  ```sql
  create table if not exists app.user_submission (
    id             uuid        default gen_random_uuid() primary key,
    user_id        uuid        not null references auth.users (id) on delete cascade,
    product_name   text        not null,
    description    text        not null,
    product_url    text        not null,
    github_url     text,
    status         text        not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected')),
    -- AI review results
    review_status  text        check (review_status in ('pending', 'valid', 'invalid')),
    review_reason  text,        -- why it was flagged invalid
    review_errors  jsonb,       -- array of strings: each failed validation check
    created_at     timestamptz not null default now(),
    reviewed_at    timestamptz,
    -- If approved, links to the created project record
    project_id     uuid references app.project (id) on delete set null
  );

  create index if not exists user_submission_status_idx
    on app.user_submission (status);

  create index if not exists user_submission_user_idx
    on app.user_submission (user_id);

  alter table app.user_submission enable row level security;

  -- Users see only their own submissions
  create policy user_submission_select_own on app.user_submission
    for select using (auth.uid() = user_id);

  create policy user_submission_insert_own on app.user_submission
    for insert with check (auth.uid() = user_id);
  ```

  **Part 2 — AI Validation Worker**
  New file: `apps/worker/src/submission-review.ts`
  - Trigger: when a new row with `review_status = 'pending'` appears (poll every 60s, or webhook via Supabase)
  - Calls DeepSeek (same LLM as used for classification) with a prompt:
    ```
    Validate this product submission:
    - Name: {product_name}
    - Description: {description}
    - Product URL: {product_url}
    - GitHub URL: {github_url}

    Check:
    1. Is the product_url a real web URL (not a placeholder, not empty)?
    2. Is the github_url a valid GitHub repo URL (https://github.com/owner/repo) or empty/null?
    3. Does the description describe a real software product (not spam, not a random thought)?
    4. Does the description mention any specific GitHub repo that matches the github_url?

    Respond in JSON:
    {
      "valid": true/false,
      "reasons": ["reason1", "reason2"],
      "errors": ["Check 1 failed: URL is a placeholder"]
    }
    ```
  - If `valid` is true:
    - Insert a row into `app.project` with `name`, `one_liner` (shortened description), `primary_url = product_url`, `created_at = now()`
    - Insert `app.identity_link` for github if github_url provided
    - Set `submission.project_id = new_project.id`, `status = 'approved'`, `review_status = 'valid'`
    - The project will be auto-categorized by the existing LLM classification pipeline (migration 0007) on next run
  - If `valid` is false:
    - Set `review_status = 'invalid'`, `review_reason` and `review_errors` from LLM response
    - Keep `status = 'pending'` (admin can override)

  **Part 3 — New DB queries in `apps/web/lib/db.ts`**
  Add:
  - `getUserSubmissions(userId: string): Promise<UserSubmission[]>`
  - `submitProduct(userId, name, description, productUrl, githubUrl?): Promise<{id}>
  - `getActiveSubmissions(): Promise<UserSubmission[]>` (admin only, or publicly just count)
  - Add a new `ProjectListItem` source: `getRecentlySubmittedProjects()` — same shape as existing items, but from `app.project` where `project.id IN (select project_id from app.user_submission where status = 'approved' and project_id is not null)`, ordered by `created_at desc`, limit 10

  **Part 4 — "Recently Submitted" category on /projects**
  - `apps/web/lib/categories.ts`: add `'recently-submitted'` to `LLM_CATEGORIES` array
  - `apps/web/lib/i18n.ts`: add translation key for the new category (EN: "Recently Submitted by Developers", ZH: "开发者最近提交")
  - `apps/web/app/projects/page.tsx`: after fetching `getAllProjects()`, also fetch `getRecentlySubmittedProjects()` and merge/filter. Show them as a separate pinned section above the main table (similar to how categories filter works but as its own "source" section), or add them as a clickable category filter in the dropdown.
    - Simpler approach: add to the category dropdown as a special filter. When selected, show only recently-submitted projects (hide the table and show a dedicated card grid).
  - The `ProjectSearch` component: should include this new category in its filter options

  **Part 5 — Frontend: Submission form**
  New file: `apps/web/app/submit/page.tsx` — Next.js page:
  - Route: `/submit`
  - Server component that checks auth (redirect to `/login` if not logged in)
  - Renders a `SubmitForm` client component (new file: `apps/web/components/submit-form.tsx`)
  
  **SubmitForm client component:**
  - Fields: Product Name (required), Product URL (required, validated client-side as URL), GitHub URL (optional, validated as GitHub repo URL), Description (required, 50-500 chars, textarea with character counter)
  - Submit button: "Submit for Review"
  - On submit: POST to `/api/submit-product` with JSON body
  - Show loading state during submission
  - Show success state: "Submitted! Our AI will review it shortly." + link to `/projects?category=recently-submitted`
  - Show error state inline

  **Part 6 — API route**
  New file: `apps/web/app/api/submit-product/route.ts`:
  - POST handler
  - Validates session (get user from supabase server client)
  - Validates input fields server-side (same checks as client-side)
  - Inserts into `app.user_submission` (service_role client)
  - Returns `{ success: true, submissionId }` or `{ success: false, error }`
  - The async AI review runs in a separate worker (not blocking the HTTP response) — the worker polls `review_status = 'pending'` rows

  **Part 7 — Header/Nav link**
  - `apps/web/components/site-header.tsx`: add "Submit" link (to `/submit`) in the main nav, only visible when logged in

  **Part 8 — UI for existing submissions**
  - `apps/web/app/account/page.tsx` (or new route `/account/submissions`): show the authenticated user's submission history with status badges
  - Each row: product name, current status (pending/approved/rejected), created date, link to project if approved

  **Not in scope for this task:**
  - Gamification (badges, points for submitting)
  - Voting/upvoting on submitted products
  - Editing submissions after review
  - Admin panel to override review decisions (manual SQL for now)

---

## [2026-06-28] TASK-012: Refine /dashboard UI — more professional, cleaner, elevated
- **Priority**: P1
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-28 23:00 PDT
- **PR**: #90 (merged)
- **Verify**: PASS — /dashboard has refined typography, better spacing, subtle shadows, skeleton loading, responsive polish

## [2026-06-28] TASK-011: Hide future/incomplete weeks on /trends + fix cron time
- **Priority**: P1
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-28 22:35 PDT
- **PR**: #88 (merged)
- **Verify**: PASS — /trends now defaults to "Week of 2026-06-22 – 06-28" (latest *ended* week); the in-progress week is gone from selector and header

## [2026-06-28] TASK-010: Fix YouTube insights — translate Chinese content to English in EN locale
- **Priority**: P1
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-28 22:26 PDT
- **PR**: #89 (merged)
- **Verify**: PASS — backfill-chinese-insights worker script ran successfully via gh workflow run

## [2026-06-28] TASK-009: Remove GitHub link from footer
- **Priority**: P2
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-28 22:12 PDT
- **PR**: #87 (merged)

## [2026-06-28] TASK-008: Regenerate weekly trends data — rerun pipeline for history weeks
- **Priority**: P0 BUG
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-28 22:05 PDT

## [2026-06-28] TASK-006: Fix empty YouTube insight cards on /youtube-insights
- **Priority**: P0 BUG
- **Status**: done
- **Locked by**: coder-auto
- **PR**: #82

## [2026-06-28] TASK-005: Landing page — "OpenProduct" marketing homepage
- **Priority**: P0
- **Status**: done
- **Locked by**: coder-auto
- **PR**: #84

## [2026-06-28] TASK-004: Product rename — "Product Tracer" → "OpenProduct"
- **Priority**: P0
- **Status**: done
- **Locked by**: coder-auto
- **PR**: #83

## [2026-06-28] TASK-007: Fix weekly trends — dedup weeks, week-unique insights
- **Priority**: P0 BUG
- **Status**: done
- **Locked by**: coder-auto

## [2026-06-27] TASK-000: User Auth + Synced Bookmarks
- **Priority**: P0
- **Status**: done
- **PR**: #77

---

## [2026-06-29] TASK-014: Make "Submit Product" visible to all users (not just logged-in)
- **Priority**: P1
- **Status**: ready
- **Locked by**:
- **Locked at**:
- **Acceptance**: The "Submit" link/button is visible in the nav to ALL visitors (logged-in or not). Anonymous users who click it see a modal/overlay saying "Sign in to submit your product" with a button to /login. Logged-in users go directly to /submit.
- **Spec**:
  **Goal:** Make the product submission flow accessible to everyone. Logged-in users go directly to `/submit`. Anonymous users see an inline sign-in prompt instead of a 307 redirect or broken page.

  **Files to touch:**

  ### Part 1 — Submit link visible for everyone
  - `apps/web/components/site-header.tsx`:
    - Remove the `session` guard that hides the Submit link for anonymous users
    - Always render the Submit nav item in the header
    - The link target: for logged-in users → `/submit`; for logged-out users → keep it as `/submit` (the page itself will handle anonymous UX)

  ### Part 2 — `/submit` page handles anonymous users gracefully
  - `apps/web/app/submit/page.tsx`:
    - Currently redirects to `/login` if not logged in. Change this:
    - Detect anonymous session (check `session` — if null, the user is anonymous)
    - If anonymous: render a clean, centered overlay/modal with:
      - An icon (LockClosed or similar, 48px, muted)
      - Heading: "Sign in to submit your product"
      - Body: "You need an account to submit a product. It takes 30 seconds."
      - CTA button: "Sign in with GitHub" (links to `/login` or triggers sign-in flow)
      - Subtle text: "Already have an account? Sign in" (same link)
      - No heading banner, no footer distractions — just this card centered
    - If logged in: render the existing `<SubmitForm />` as-is

  ### Part 3 — Clean up the route
  - Remove the old `redirect('/login')` logic from `page.tsx` entirely
  - The new anonymous page should be a server component that reads the session and conditionally renders the sign-in prompt vs. the form

  **Keep unchanged:**
  - The submission form, API route, worker, DB schema — all existing logic unaffected
  - Auth flow (GitHub OAuth via Supabase) stays exactly as-is
  - `/submit` route remains the same URL

  **Don't do:**
  - Don't add a modal/dialog library — keep it simple, just render inline on the page
  - Don't change header styling or layout
  - Don't add analytics events
