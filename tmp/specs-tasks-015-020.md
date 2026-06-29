## [2026-06-29] TASK-015: Upvote/Downvote system for products
- **Priority**: P0 FEATURE
- **Status**: ready
- **Locked by**:
- **Locked at**:
- **Acceptance**: Users can upvote/downvote products. Products show vote count. /projects has a "Most Upvoted" sort option. Vote counts displayed on product detail pages.
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
- **Status**: ready
- **Locked by**:
- **Locked at**:
- **Acceptance**: Each /projects/[slug] page generates a beautiful OG image and has Twitter/LinkedIn share buttons. Copy link button too.
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
- **Status**: ready
- **Locked by**:
- **Locked at**:
- **Acceptance**: Landing page has an email input: "Get weekly indie product digest". Submissions saved. Weekly trends emailed via Gmail.
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
- **Status**: ready
- **Locked by**:
- **Locked at**:
- **Acceptance**: Logged-in users see personalized dashboard: upvoted products, submission status, bookmarked projects, recent activity.
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
- **Status**: ready
- **Locked by**:
- **Locked at**:
- **Acceptance**: /projects search searches names AND descriptions. Tag/category filter works with search combined.
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
- **Status**: ready
- **Locked by**:
- **Locked at**:
- **Acceptance**: Users can select 2-3 products and see a side-by-side comparison of GitHub stars, platforms, category, description, and created date.
- **Spec**:
  **Goal:** Let users compare 2-3 products side by side.

  **Part 1 — Compare mode on /projects**
  - Add a checkbox on each row in the /projects table for selecting products to compare
  - Max 3 selections. Show "Compare (N)" button that becomes active when N >= 2
  - When clicked, navigate to `/compare?ids=uuid1,uuid2`

  **Part 2 — /compare route**
  - Server component that loads projects by IDs
  - Renders a `CompareTable` component: side-by-side columns
  - Rows: Name, Description, GitHub Stars, Platforms, Category, Submitted Date
  - Simple responsive grid: 2-column on tablet, 3-column on desktop

  **Part 3 — Cleanup**
  - Clear selection button
  - "Add another" link back to /projects
  - Proper meta tags (og:title = "Compare products on OpenProduct")

  **Files:**
  - New: `apps/web/app/compare/page.tsx`
  - New: `apps/web/components/compare-table.tsx`
  - Modified: `apps/web/app/projects/page.tsx` — add checkboxes to table rows
  - Modified: `apps/web/app/projects/projects-table.tsx` — selection state
