## Frontend Tasks — Detail Page Content Richness + Mobile Scroll Fix

### Task 0: Fix horizontal scroll on / at 375px (P2)

**Re-routed from backend queue (scope mismatch).** This is a CSS/frontend issue, not backend.

**Root cause investigation (from RESPONSE.md):**
- PR #39 added `overflow-x-clip` to `<body>` in `apps/web/app/layout.tsx` — but this only prevents body-level scroll
- `<html>` may still overflow. Need `overflow-x: clip` on `<html>` in `globals.css`
- Components using `position: absolute/fixed` with wide children could protrude
- CSS grid/flex layouts unstyled at 375px could cause overflow

**Fix: add to `apps/web/app/globals.css`:**
```css
html { overflow-x: clip; }
```

Then if the bug persists, inspect these components at 375px:
- `apps/web/app/page.tsx` — homepage content
- `apps/web/components/site-header.tsx` — fixed/absolute positioning
- Any full-bleed container — ensure `max-width: 100vw`

---

## Frontend Tasks — Detail Page Content Richness

### Background

Focus C tour (2026-06-21) revealed detail pages are content deserts:
- 150-260 chars total content across 5 tested pages
- 0 related project links on every page
- AI summaries NOT rendering (despite backend having 50+ summaries populated, per FRONTEND_RESPONSE.md)
- No breadcrumb navigation (missing on 2 of 5 pages)
- ZH locale shows 0 Chinese characters
- 2 of 5 slugs return 404 (dietrichgebert-ponytail, esengine-deepseek-reasonix)

### Files to Touch

**Only these apps/web/ files:**
- `apps/web/app/projects/[slug]/page.tsx` — main detail page layout, add breadcrumb, structured sections, related projects
- `apps/web/app/projects/[slug]/not-found.tsx` — graceful 404 page
- `apps/web/lib/db.ts` — add `getRelatedProjects(slug, category, limit)` query
- `apps/web/components/related-projects.tsx` — NEW: horizontal card row component
- `apps/web/lib/i18n.ts` — add detail page i18n keys
- `apps/web/lib/types.ts` — add `RelatedProject` type if needed

### Tasks

#### Task 1: Debug and fix AI summary rendering (2h)

The backend PR #40 and migration 0013 added `app.project.ai_summary` column with 50+ populated rows. Frontend PR #41 was merged claiming to render it, but production pages show NO AI summaries.

**Find and fix:**
1. Check `apps/web/lib/db.ts` — does the `ProjectDetail` query select `ai_summary`?
2. Check `apps/web/app/projects/[slug]/page.tsx` — is the component rendering it?
3. If the column is in the query but not rendering, find the component that should show it
4. If the column is missing from the query, add it: `project.ai_summary`
5. Fall back gracefully: if `ai_summary IS NULL`, show nothing (the daily cron populates 50/day)

#### Task 2: Add breadcrumb navigation (1h)

Add a semantic breadcrumb at the top of the detail page:
```tsx
<nav aria-label="Breadcrumb" className="mb-4">
  <ol className="flex items-center gap-2 text-sm text-neutral-500">
    <li><Link href="/projects">{t('nav.projects')}</Link></li>
    <li className="flex items-center gap-2">
      <ChevronRight className="h-3 w-3" />
      <span className="text-neutral-900 dark:text-neutral-100">{project.name}</span>
    </li>
  </ol>
</nav>
```

#### Task 3: Structured sections (2h)

Organize the detail page into clear visual sections:
1. **Header:** Project name + one-liner + platform badges (stars, upvotes)
2. **AI Summary:** (if `ai_summary` is not null) — rounded light-gray bg block with sparkle icon
3. **External Links:** GitHub, PH, HN links as badges/buttons
4. **Related Projects:** horizontal card row (Task 4)

#### Task 4: Related Projects component (4h)

**New file:** `apps/web/components/related-projects.tsx`

```tsx
// Server component that fetches projects in the same llm_category
// Excludes current project, orders by stars DESC, limits to 4

interface RelatedProjectsProps {
  currentSlug: string;
  category: string | null;
}

// Display as horizontal row of mini cards:
// ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
// │ Project Name │ │ Project Name │ │ Project Name │ │ Project Name │
// │ one-liner... │ │ one-liner... │ │ one-liner... │ │ one-liner... │
// │ ⭐ 2.4k      │ │ ⭐ 1.1k      │ │ ⭐ 890       │ │ ⭐ 450       │
// │ View →       │ │ View →       │ │ View →       │ │ View →       │
// └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

**DB query in `apps/web/lib/db.ts`:**

```ts
export async function getRelatedProjects(
  sql: ReturnType<typeof createSql>, 
  slug: string, 
  category: string | null,
  limit = 4
): Promise<RelatedProject[]> {
  if (!category) return [];
  
  const rows = await sql<RelatedProject[]>`
    SELECT p.id, p.name, p.slug, p.one_liner, 
           p.stars, p.ai_summary
    FROM app.project p
    WHERE p.llm_category = ${category}
      AND p.slug != ${slug}
      AND p.stars IS NOT NULL
    ORDER BY p.stars DESC
    LIMIT ${limit}
  `;
  
  return rows.map(r => ({
    ...r,
    localizedText: r.one_liner,
  }));
}
```

#### Task 5: Graceful 404 page (1h)

**New file:** `apps/web/app/projects/[slug]/not-found.tsx`

```tsx
import Link from 'next/link';

export default function ProjectNotFound() {
  return (
    <div className="mx-auto max-w-xl py-20 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-4 text-neutral-500">
        This project is no longer tracked or the link is broken.
      </p>
      <Link 
        href="/projects" 
        className="mt-6 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-white"
      >
        Browse all projects →
      </Link>
    </div>
  );
}
```

#### Task 6: ZH i18n for detail page sections (1h)

Add these keys to `apps/web/lib/i18n.ts`:

```ts
// EN
detail: {
  aiSummary: 'AI Summary',
  externalLinks: 'Links',
  relatedProjects: 'More in {category}',
  noRelatedProjects: '',
  backToProjects: 'Back to projects',
}

// ZH
detail: {
  aiSummary: 'AI 概述',
  externalLinks: '相关链接',
  relatedProjects: '更多 {category} 项目',
  noRelatedProjects: '',
  backToProjects: '返回项目列表',
}
```

### Acceptance Criteria

1. ✅ Detail pages render AI summaries (when `ai_summary` is not null)
2. ✅ Breadcrumb shows "Projects > {project name}" at top
3. ✅ Related projects section shows 4 cards in same category, ordered by stars
4. ✅ Graceful 404 page with search suggestion (doesn't break the site)
5. ✅ ZH locale shows Chinese labels on detail page
6. ✅ pnpm --filter @product-tracer/web typecheck passes
7. ✅ No horizontal scroll regressions on mobile (375px)

### Rules
- PR → Vercel preview ✅ → merge to main → verify production
- Only touch apps/web/ files
- pnpm --filter @product-tracer/web typecheck must pass
- Git author: JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>
- No DB changes needed (all columns already exist: `ai_summary`, `llm_category`, `stars`)

### After completing
1. Update CHANGELOG.md
2. Delete this file
3. Write summary to assistant-queue/FRONTEND_RESPONSE.md
