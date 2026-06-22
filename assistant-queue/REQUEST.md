# Feature Request: Global Fuzzy Search

**Status:** In Queue (written by JBK @ 2026-06-21 14:05)
**Priority:** P0
**Effort:** 3 days

---

## Summary

Add a search bar in the site header + `/search?q=` page with Postgres full-text fuzzy search across project names, descriptions, one-liners, and tags. Include keyboard shortcut (Cmd+K) and platform facet filters.

---

## Backend

### 1. Full-Text Search Index

Run this migration:

```sql
CREATE INDEX idx_projects_fts ON projects 
  USING GIN(to_tsvector('simple', 
    coalesce(name,'') || ' ' || 
    coalesce(one_liner,'') || ' ' || 
    coalesce(description,'')
  ));
```

### 2. API Endpoint: `GET /api/search?q=<query>&limit=20&offset=0`

**File:** `apps/web/src/app/api/search/route.ts` (new)

Implementation:

```ts
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const offset = parseInt(searchParams.get('offset') || '0');
  const platform = searchParams.get('platform'); // optional filter

  if (!q || q.length < 2) {
    return NextResponse.json({ data: [], total: 0 });
  }

  const supabase = createClient();

  // Use Postgres full-text search with ts_query
  const query = supabase
    .from('projects')
    .select('*', { count: 'exact' })
    .textSearch('fts_index', q, {
      type: 'websearch',
      config: 'simple',
    })
    .order('github_stars', { ascending: false })
    .range(offset, offset + limit - 1);

  if (platform) {
    query.eq('platform', platform);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data: data.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      one_liner: p.one_liner,
      description: p.description,
      llm_category: p.llm_category,
      github_stars: p.github_stars,
      ph_upvotes: p.ph_upvotes,
      platforms: p.platforms,
      external_url: p.external_url,
      external_id: p.external_id,
      created_at: p.created_at,
    })),
    total: count,
    query: q,
  });
}
```

**Note:** If the GIN index on `fts_index` doesn't exist, create it as a generated column or use `to_tsvector` in the query directly:

```sql
-- Alt approach with generated column:
ALTER TABLE projects ADD COLUMN fts_index tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', 
    coalesce(name,'') || ' ' || 
    coalesce(one_liner,'') || ' ' || 
    coalesce(description,'')
  )) STORED;
```

### 3. Search Highlight Helper

Create `apps/web/src/lib/search-highlight.ts`:

```ts
export function highlightMatch(text: string, query: string): string {
  if (!text || !query) return text;
  const words = query.split(/\s+/).filter(Boolean);
  let result = text;
  for (const word of words) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(
      new RegExp(`(${escaped})`, 'gi'),
      '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">$1</mark>'
    );
  }
  return result;
}
```

---

## Frontend

### 1. Search Bar in `<SiteHeader>`

**File:** `apps/web/src/components/site-header.tsx`

- Add a search icon button (magnifying glass) next to the language switcher
- On click (or Cmd+K / Ctrl+K), open a search dialog/modal
- The search bar auto-focuses and shows results as the user types (debounced 300ms)

### 2. Search Dialog Component

**File:** `apps/web/src/components/search-dialog.tsx` (new)

- Uses `@radix-ui/react-dialog` or `<dialog>` element
- Input field that calls `/api/search?q=...` with debounce
- Results appear as a dropdown list with:
  - Project name (highlighted matches)
  - One-liner (highlighted matches)
  - Category badge
  - GitHub stars count
  - Platform badge icons
- Clicking a result navigates to `/projects/[slug]`
- `Escape` closes dialog, arrow keys navigate results

### 3. Full `/search` Page

**File:** `apps/web/src/app/search/page.tsx` (new)

- Server component that reads `q` from URL params
- Fetches from `/api/search?q=...` on mount (client component wrapper)
- Shows:
  - Search input at top (larger, persistent)
  - "X results for 'query'" header
  - Platform facet filters: All | GitHub | HN | Product Hunt | YouTube | Reddit | X
  - Results as a grid of project cards (reuse `ProjectCard` component with highlight support)
  - Pagination (20 per page, prev/next)
- Empty state: "No results found for 'query'. Try different keywords."

### 4. Keyboard Shortcut

**File:** `apps/web/src/components/search-dialog.tsx`

```tsx
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen(true);
    }
  };
  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}, []);
```

---

## Data Flow

```
User types in search bar
  ↓ (300ms debounce)
GET /api/search?q=langchain&limit=5
  ↓
Postgres ts_vector search (GIN index)
  ↓
Returns ProjectListItem[] → renders dropdown
  ↓
User clicks result → navigates to /projects/[slug]
  ↓
User presses Enter on empty → navigates to /search?q=langchain
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/web/src/app/api/search/route.ts` | **Create** | Backend search API endpoint |
| `apps/web/src/components/search-dialog.tsx` | **Create** | Search dialog with dropdown results |
| `apps/web/src/app/search/page.tsx` | **Create** | Full search results page |
| `apps/web/src/app/search/loading.tsx` | **Create** | Loading skeleton for search page |
| `apps/web/src/lib/search-highlight.ts` | **Create** | Text highlighting utility |
| `apps/web/src/components/site-header.tsx` | **Modify** | Add search trigger button |
| `apps/web/src/components/project-card.tsx` | **Modify** | Accept optional `query` prop for highlights |
| DB migration | **Run** | `CREATE INDEX idx_projects_fts ON projects USING GIN(...)` |

---

## Testing Checklist

- [ ] Search returns correct results for partial matches ("lang" → "LangChain")
- [ ] Search handles special characters (quotes, dashes)
- [ ] Empty query returns 0 results, not error
- [ ] Platform filters work correctly
- [ ] Cmd+K opens search dialog on Mac and Windows
- [ ] Arrow keys navigate results
- [ ] Click on result navigates to project page
- [ ] Search page pagination works
- [ ] Mobile: search bar is usable on small screens
- [ ] Highlighted terms don't break XSS (query is escaped in highlight function)
