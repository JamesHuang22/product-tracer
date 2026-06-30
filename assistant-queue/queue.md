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
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-29 09:00 PDT
- **PR**: #92 (merged)
- **Verify**: PASS — /submit now 200 for anonymous (was 307→/login); renders centered sign-in card (Lock icon, "Sign in to submit your product", "Sign in with GitHub" CTA → /login). Submit nav link shown to all users (desktop + mobile, authed guard removed). Logged-in users still get <SubmitForm />. / 200. typecheck clean.
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

---

## [2026-06-29] TASK-015: Upvote/Downvote system for products
- **Priority**: P0 FEATURE
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-29 09:15 PDT
- **PR**: #93 (merged)
- **Verify**: PASS — migration 0019 applied via Supabase MCP (app.product_vote table + RLS policies; upvotes/downvotes int cols on app.project, backfilled 0). /projects 200, /projects/tanstack-ai 200, POST /api/vote anon → 401 (correct). Shipped: voteOnProject/getUserVote in db.ts (toggle-off on repeat, recomputes tallies), /api/vote route (auth + validation), VoteButton client component (optimistic ▲/net/▼, 401→"Sign in to vote" inline prompt), "Most upvoted" sort + sortable Votes column on /projects (desktop table + mobile cards), VoteButton on detail header seeded with user's vote. i18n EN+ZH keys added. typecheck clean.
- **Spec**:
  **Goal:** Add a full upvote/downvote system so users can vote on products and see rankings.

  **Part 1 — DB: New migration (0019_product_vote.sql)**
  ```sql
  create table if not exists app.product_vote (
    id         uuid        default gen_random_uuid() primary key,
    user_id    uuid        not null references auth.users(id) on delete cascade,
    project_id uuid        not null references app.project(id) on delete cascade,
    vote       smallint    not null check (vote in (-1, 1)),
    created_at timestamptz not null default now(),
    unique (user_id, project_id)
  );
  create index if not exists product_vote_project_idx on app.product_vote (project_id);
  ```
  Add `upvotes int not null default 0` and `downvotes int not null default 0` columns to `app.project`. Update existing rows: `update app.project set upvotes=0, downvotes=0`.

  **Part 2 — API: POST /api/vote**
  - Body: `{ projectId, vote: 1 | -1 }`
  - Auth required (return 401 if not logged in)
  - Upsert: if same user+project exists, update vote; if vote=0, delete row
  - After write: update project upvotes/downvotes counts (or compute via COUNT)

  **Part 3 — Frontend: VoteButton component**
  - Shows ▲ upvote count ▼
  - Logged-in: clickable, highlight if user voted, optimistic UI update
  - Anonymous: click shows the same sign-in prompt modal as TASK-014

  **Part 4 — /projects: "Most Upvoted" sort**
  - Add "Most Upvoted" option to the sort/filter dropdown
  - Sort by `(upvotes - downvotes) desc` or `upvotes desc`

  **Part 5 — /projects/[slug]: show vote count**
  - On the detail page header, show upvote count prominently

---

## [2026-06-29] TASK-016: Product share cards (OG image + social sharing)
- **Priority**: P0 FEATURE
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-29 09:35 PDT
- **PR**: #94 (merged)
- **Verify**: PASS — /og/projects/tanstack-ai → 200 image/png (51.7KB real card: brand wordmark, category pill, name, one-liner, ★stars + ▲net votes + platform chips, Cache-Control max-age=3600). Detail page 200 with absolute og:image meta + twitter:card=summary_large_image. Shipped: getProjectOgData lean query, /og/projects/[slug] route (Node runtime), generateMetadata openGraph+twitter, ShareButtons client component (Twitter/X intent, LinkedIn share, Copy Link → navigator.clipboard + "Copied!" state) in a Share section on the detail header, i18n EN+ZH. typecheck clean.
- **Spec**:
  **Goal:** Let users share product pages easily with rich previews on Twitter/LinkedIn.

  **Part 1 — OG Image generation**
  - Use Vercel OG (next/og) to generate a dynamic OG image at `/api/og/projects/[slug]`
  - Image: product name in bold, category badge, platform icons, GitHub stars count, upvote count
  - Background: dark gradient or OpenProduct brand colors
  - Cache with `Cache-Control: public, max-age=3600`

  **Part 2 — Meta tags in /projects/[slug]**
  - Update layout or page to include `og:title`, `og:description`, `og:image`, `twitter:card=summary_large_image`
  - Generate description from product one_liner or summary

  **Part 3 — Share buttons**
  - Add a "Share" section on the product detail page
  - Buttons: Twitter/X (share URL + text), LinkedIn (share URL), Copy Link
  - Use simple anchor links: `https://twitter.com/intent/tweet?text=...&url=...`
  - Copy link uses `navigator.clipboard.writeText` with a "Copied!" toast

  **Part 4 — i18n**
  - EN: "Share on Twitter", "Share on LinkedIn", "Copy Link"
  - ZH: "分享到 Twitter", "分享到 LinkedIn", "复制链接"

---

## [2026-06-29] TASK-017: Newsletter subscription box on landing page
- **Priority**: P0 FEATURE
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-29 09:50 PDT
- **PR**: #95 (merged)
- **Verify**: PASS — migration 0020 applied via Supabase MCP (app.newsletter_subscriber, unique email, partial active index, RLS on). / 200; POST /api/subscribe-newsletter valid email → {"success":true} (200), invalid → 400. Shipped: subscribeNewsletter db fn (idempotent upsert, reactivates on resubscribe), API route w/ server-side email validation, NewsletterSignup client component (idle→loading→success/error) wired into landing "Stay in the loop" section above footer, i18n EN+ZH. Part 4 send-newsletter.ts = compiling outline (queries active subscribers + latest finished week; Gmail send left as TODO per spec "future, outline only"). Removed test-insert row from prod table. typecheck clean (web + worker).
- **Spec**:
  **Goal:** Capture emails on the landing page for a weekly newsletter.

  **Part 1 — DB: New migration (0020_newsletter.sql)**
  ```sql
  create table if not exists app.newsletter_subscriber (
    id         uuid        default gen_random_uuid() primary key,
    email      text        not null unique,
    created_at timestamptz not null default now(),
    unsubscribed_at timestamptz
  );
  ```

  **Part 2 — API: POST /api/subscribe-newsletter**
  - Body: `{ email }`
  - Server-side email format validation
  - Insert into `app.newsletter_subscriber`
  - Return `{ success: true }` or `{ error }`

  **Part 3 — Landing page: email input**
  - On `/` landing page, add a section below features:
    - Heading: "Stay in the loop" / "Get weekly indie product trends delivered to your inbox"
    - Email input + "Subscribe" button
    - Success message: "Thanks! You're subscribed."
  - Client component with loading/success/error states

  **Part 4 — Newsletter send script (future, outline only)**
  - A script in `apps/worker/` that queries `select email from app.newsletter_subscriber where unsubscribed_at is null`
  - Fetches latest weekly trends from DB
  - Sends via Gmail API (existing OAuth creds)
  - Run via GitHub Actions cron (weekly, Monday)

---

## [2026-06-29] TASK-018: Personalized "My Dashboard" for logged-in users
- **Priority**: P1
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-29 10:05 PDT
- **PR**: #96 (merged)
- **Verify**: PASS — /dashboard 200. Logged-in users now branch to <PersonalDashboard> (server component): Your Submissions (status badges, link to project if approved), Your Upvotes (getUserUpvotes — name + tally, vote=1), Bookmarked Projects (card grid), Recent Activity (merged submissions+upvotes timeline, newest-first, limit 10), plus empty-state CTA. Anonymous users keep generic HomeContent (verified 200). All personal queries defensively try/catch'd (42P01/42703 → []). Route-level loading.tsx (TASK-012) covers both. i18n EN+ZH. No DB migration needed (reuses 0018/0019). typecheck clean. Note: logged-in view not curl-verifiable (auth-gated); compiles + reuses proven queries.
- **Spec**:
  **Goal:** Replace the generic /dashboard with a personalized one for logged-in users.

  **Part 1 — Dashboard route change**
  - `apps/web/app/dashboard/page.tsx`: check if user is logged in
  - If logged in: render `PersonalDashboard` component
  - If not: render existing `HomeContent` (keep current generic dashboard)

  **Part 2 — PersonalDashboard component**
  - Sections:
    1. **Your Submissions**: list user's submissions with status badges (pending/approved/rejected), link to project if approved. Query: `select * from app.user_submission where user_id = ?`
    2. **Your Upvotes**: list of upvoted products (name, upvote count). Query: `select p.name, p.slug, pv.vote from app.product_vote pv join app.project p on p.id = pv.project_id where pv.user_id = ?`
    3. **Bookmarked Projects**: existing bookmarks query, rendered as a card grid
    4. **Recent Activity**: combined timeline of submissions + upvotes, sorted by created_at desc, limit 10

  **Part 3 — Cleanup**
  - Move the existing `HomeContent` (stats, platform sections) elsewhere or keep for anonymous users
  - Ensure both views handle loading states

---

## [2026-06-29] TASK-019: Full-text search for projects
- **Priority**: P1
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-29 10:20 PDT
- **PR**: #97 (merged)
- **Verify**: PASS — /projects 200; /api/search?q=track now returns description matches ("WebTorrent tracker", "devtrack"). Shipped: (1) table search reworked from tanstack column-only globalFilter to a client filter over name + one_liner + ai_summary + tags, combining with the category column filter; "{n} results found" line when a query is active; search box placeholder updated. (2) searchProjects (pg_trgm autocomplete) extended to substring-match one_liner + ai_summary alongside name. i18n EN+ZH. No migration. typecheck clean. NOTE: process slip — first impl commit accidentally landed on local main; recovered by moving it to feat/task-019, hard-resetting main to origin, then lock→rebase→PR (nothing bad pushed to origin main).
- **Spec**:
  **Goal:** Search across project names and descriptions for better discovery.

  **Part 1 — Backend: update search query in `db.ts`**
  - Current: `where p.name ilike '%query%'`
  - New: `where (p.name ilike '%query%' or p.one_liner ilike '%query%' or p.ai_summary ilike '%query%')`
  - If Postgres full-text search vector exists: use `to_tsvector('english', p.name || ' ' || coalesce(p.one_liner,'')) @@ plainto_tsquery('english', $query)`
  - Add a simple `LIKE` fallback for ZH locale

  **Part 2 — Frontend: search UX**
  - Search input stays in the same place (already exists)
  - Category filter and search combine together: `?q=search&category=xxx`
  - Show "X results found" below search when query is active
  - Highlight matching text in results (optional, non-blocking)

  **Files to touch:**
  - `apps/web/lib/db.ts` — `getAllProjects` query
  - `apps/web/app/projects/page.tsx` — pass search query and filter together
  - `apps/web/components/projects-table.tsx` or `ProjectSearch` — show result count

---

## [2026-06-29] TASK-020: Product comparison tool (Compare 2-3 products)
- **Priority**: P2
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-29 10:35 PDT
- **PR**: #98 (merged)
- **Verify**: PASS — /compare?ids=<uuid>,<uuid> → 200 rendering 2 side-by-side cards

---

## [2026-06-29] TASK-021: Add empty states to personalized dashboard sections
- **Priority**: P1
- **Status**: done
- **Locked by**: coder-ondemand
- **Locked at**: 2026-06-29 21:15 PDT
- **PR**: #99 (merged)
- **Verify**: PASS — typecheck + `web:build` green; production `/dashboard`, `/en/dashboard`, `/zh/dashboard` all 200, plus `/`, `/projects`, `/trends`, `/youtube-insights`, `/login`, `/compare`. Each personalized section (Submissions, Upvotes, Bookmarks, Recent Activity) now renders a bilingual `EmptyState` (icon + heading + body + CTA) when empty but the user has activity elsewhere; the all-empty welcome card is unchanged.
- **Acceptance**: When a logged-in user has no bookmarks, no upvotes, and no submissions yet, the dashboard shows helpful empty state messages + CTA instead of blank sections.
- **Spec**:
  **Goal:** Add empty state messages to every section of the personalized dashboard (`/dashboard` for logged-in users) so new users see clear guidance instead of blank/empty sections.

  **Files to touch:**
  - `apps/web/app/dashboard/page.tsx` — may need to receive empty-state props or detect emptiness server-side
  - `apps/web/components/personal-dashboard.tsx` — the PersonalizedDashboard component (from TASK-018), where the actual sections live

  **Specific sections that need empty states:**

  ### 1. "Your Submissions" empty state
  - Show when the submissions query returns 0 rows
  - Display: icon (PaperAirplane or DocumentPlus, 48px, muted neutral-400), heading "No submissions yet", body "Submit a product to get started — our AI will review it quickly.", CTA button "Submit a Product" → `/submit`

  ### 2. "Your Upvotes" empty state
  - Show when upvotes query returns 0 rows
  - Display: icon (HandThumbUp outline, 48px, muted), heading "No upvotes yet", body "Browse projects and upvote the ones you like. Your votes help the community discover great products.", CTA button "Browse Projects" → `/projects`

  ### 3. "Bookmarked Projects" empty state
  - Show when bookmarks query returns 0 rows
  - Display: icon (Bookmark outline, 48px, muted), heading "No bookmarks yet", body "Bookmark projects you want to keep an eye on. They'll appear here for quick access.", CTA button "Discover Projects" → `/projects`

  ### 4. "Recent Activity" empty state
  - Show when the recent activity timeline has 0 items
  - Display: simpler treatment — heading "No recent activity", body "Your actions — submissions, upvotes, bookmarks — will show up here." (no CTA, as other CTAs already cover it)

  **Design rules for all empty states:**
  - Centered within their section container, `py-12` vertical padding
  - Icon: 48×48, `text-neutral-300` / `dark:text-neutral-600`, use existing Lucide icons already in the project
  - Heading: `text-base font-medium text-neutral-600 dark:text-neutral-300`
  - Body: `text-sm text-neutral-400 dark:text-neutral-500 max-w-sm mx-auto text-balance`
  - CTA button (where applicable): `text-sm`, use the project's existing button styling (`Button` component or inline `<a>` with `text-emerald-600 hover:text-emerald-700`)
  - Each empty state wrapped in a `div` with the existing section container classes

  **Implementation approach:**
  - Add a helper component `EmptyState` inside `personal-dashboard.tsx` (or a new file `apps/web/components/empty-state.tsx`):
    ```tsx
    function EmptyState({ icon, title, description, cta }: { icon: LucideIcon; title: string; description: string; cta?: { label: string; href: string } }) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Icon className="h-12 w-12 text-neutral-300 dark:text-neutral-600 mb-4" />
          <h3 className="text-base font-medium text-neutral-600 dark:text-neutral-300">{title}</h3>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 max-w-sm mx-auto text-balance mt-1">{description}</p>
          {cta && (
            <Link href={cta.href} className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              {cta.label} →
            </Link>
          )}
        </div>
      );
    }
    ```
  - In each section of `PersonalDashboard`, check if the data array is empty → render `<EmptyState>` instead of the list/grid
  - Default imports: `import { Bookmark, HandThumbUp, PaperAirplane, Clock } from '@heroicons/react/24/outline'` or the equivalent Lucide icons already used in the project

  **Keep unchanged:**
  - All data fetching, query logic, existing components
  - The anonymous HomeContent (TASK-018 kept it for non-logged-in users, that's fine)
  - `/dashboard` route structure
  - i18n (ENG only for now — empty state text can live in the component directly, or add i18n keys if preferred)

  **Don't do:**
  - Don't add new dependencies or animation libraries
  - Don't change section layout/structure when data exists
  - Don't touch the anonymous dashboard experience

---

## [2026-06-29] TASK-022: Add Compare UI entry points on /projects
- **Priority**: P1
- **Status**: done
- **Locked by**: coder-auto
- **Locked at**: 2026-06-29 21:30 PDT
- **PR**: #100 (merged)
- **Verify**: PASS — /projects 200. Builds on the compare feature from TASK-020. This task's deltas: (1) compare action bar converted from inline to a FIXED floating bottom bar (fixed inset-x-0 bottom-0 z-50, border-t, shadow-lg, backdrop-blur, dark-mode) centered to max-w-6xl; appears at ≥1 selected, Compare button enabled at ≥2 / greyed at 1, Clear button. (2) checkbox moved to FIRST column (before project name) on desktop; mobile card checkbox already present. (3) pb-20 spacer on the table container so the fixed bar never covers pagination. typecheck clean.
- **Spec**:
  **Goal:** Make the compare feature discoverable from /projects.

  **Part 1 — Checkboxes on table rows**
  - `apps/web/components/projects-table.tsx` (or wherever the project table rows render):
    - Add a checkbox column before the project name
    - Desktop: show checkbox on each row
    - Mobile: show checkbox on each card
    - Track selection state (array of selected project IDs, max 3)

  **Part 2 — Floating action bar**
  - When N >= 1 selected, show a sticky bottom bar:
    - "N selected" text
    - "Compare (N)" button (enabled only when N >= 2, disabled greyed out when N=1)
    - "Clear" button
    - On "Compare" click: navigate to `/compare?ids=id1,id2`
    - On "Clear": reset selection

  **Part 3 — Visual**
  - Sticky bar: `fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 z-50`
  - Checkbox: simple `<input type="checkbox">` or custom styled checkbox
  - Dark mode support

  **Files:**
  - `apps/web/app/projects/page.tsx` — add comparison state management
  - `apps/web/components/projects-table.tsx` — checkboxes + bar
  - OR `apps/web/components/projects-search.tsx` if the table lives inside it

---

## [2026-06-29] TASK-023: Show default dashboard when logged-in user has no data
- **Priority**: P1 BUG
- **Status**: in-progress
- **Locked by**: coder-auto
- **Locked at**: 2026-06-29 21:45 PDT
- **Acceptance**: When a logged-in user has no bookmarks, upvotes, or submissions, the /dashboard shows the normal generic dashboard (HomeContent) instead of empty personalized view.
- **Spec**:
  **Goal:** Instead of showing "Your dashboard is empty" when a logged-in user has no data, fall back to the generic dashboard.

  **In `apps/web/app/dashboard/page.tsx`:**
  - After fetching personalized data (submissions, upvotes, bookmarks), check if ALL are empty
  - If user has no submissions AND no upvotes AND no bookmarks → render `<HomeContent />` (the same component shown to anonymous users)
  - Only show `<PersonalDashboard />` if at least one section has data

  **Note:** The HomeContent component already exists from TASK-018 — it shows stats, platform sections, latest activity. It's the generic view. Just reuse it.

  **Files to touch:**
  - `apps/web/app/dashboard/page.tsx` — conditional render based on data presence

---

## [2026-06-29] TASK-024: Filter out irrelevant YouTube content (food vlogs, non-tech) + clean existing data
- **Priority**: P0 BUG
- **Status**: ready
- **Locked by**:
- **Locked at**:
- **Acceptance**: YouTube insights no longer shows non-tech/irrelevant videos (food, daily vlogs, gossip, random thoughts). Existing non-tech videos are removed from DB. Collector filters before storing.
- **Spec**:
  **Goal:** Remove non-tech YouTube content from the platform — both existing data and future collections.

  **Part 1 — Quick cleanup script (existing data)**
  - Write a script `apps/worker/src/clean-irrelevant-youtube.ts`
  - Fetch all videos from `app.youtube_video` where `key_insight` is non-null
  - For each, call LLM (DeepSeek) with a simple prompt:
    ```
    Is this video relevant to indie developers, AI, startups, or tech? Respond only: "yes" or "no"
    Title: {title}
    Description: {description}
    Key insight: {key_insight}
    ```
  - If "no": set `is_relevant = false` on the video row (add this column first, see migration below)
  - If "yes": set `is_relevant = true`
  - Run via `gh workflow run` with a dedicated workflow

  **Part 2 — DB migration (0021_youtube_relevance.sql)**
  ```sql
  alter table app.youtube_video add column if not exists is_relevant boolean not null default true;
  create index if not exists youtube_video_relevant_idx on app.youtube_video (is_relevant);
  ```

  **Part 3 — Update collector to filter at ingestion**
  - `apps/worker/src/collectors/youtube.ts`:
    - After fetching each video's transcript/summary, before storing:
    - Quick keyword check: if none of these appear in title/description → skip:
      `ai, ml, llm, gpt, cloud, startup, code, programming, developer, tech, software, engineer, data, web, app, product, security, saas, open source, framework, api, agent`
    - (This catches food vlogs, gossip, random life content)
    - Then LLM check (same prompt as Part 1) for borderline cases
    - Only insert into DB if `is_relevant = true`

  **Part 4 — Update YouTube insights query**
  - `apps/web/lib/db.ts`: all YouTube insight queries add `WHERE is_relevant = true`
  - This immediately hides all flagged content from the UI

  **Files:**
  - New: `apps/worker/src/clean-irrelevant-youtube.ts`
  - New: `packages/db/migrations/0021_youtube_relevance.sql`
  - Modified: `apps/worker/src/collectors/youtube.ts`
  - Modified: `apps/web/lib/db.ts`

---

## [2026-06-29] TASK-025: Fix GitHub collector timeout — batch smaller, skip blocked repos
- **Priority**: P0 BUG
- **Status**: ready
- **Locked by**:
- **Locked at**:
- **Acceptance**: GitHub Actions collect-github workflow completes within the 15-min timeout. Handles 403 blocked repos gracefully (skip, don't retry). Batches refreshes into chunks.
- **Spec**:
  **Goal:** Fix the collect-github workflow that keeps getting cancelled because it tries to refresh 2900+ repos within the GitHub Actions 15-min timeout.

  **Root cause:** The collector refreshes ALL known repos (~2900) in a single pass. With API rate limits and 403 responses on blocked repos, it times out.

  **Fix in `apps/worker/src/scripts/collect-github.ts`:**
  1. **Batch the refresh:** Instead of fetching all 2900 repos in one loop, process in batches of 100 repos per batch. After each batch, log progress and yield (short sleep 1-2s).
  2. **Skip blocked repos instantly:** When a repo returns 403 with "Repository access blocked", catch the error and immediately skip — don't retry, don't slow down the batch. Mark it as "skip" in the cache.
  3. **Add a timeout guard:** If the total elapsed time exceeds 10 minutes, stop refreshing and store whatever has been processed so far. Next run picks up the rest.
  4. **Log batch progress:** Print "Batch X/Y complete (Z repos stored, elapsed N min)" every 5 batches for visibility.

  **Also update the workflow timeout:**
  - `.github/workflows/collect-github.yml`: change `timeout-minutes: 15` → `timeout-minutes: 20` (a bit more headroom)

  **File to touch:**
  - `apps/worker/src/scripts/collect-github.ts`
  - `.github/workflows/collect-github.yml`


