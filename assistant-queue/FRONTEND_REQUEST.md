## Frontend Tasks

### 1. Browser language auto-detection on first visit

**File:** `apps/web/lib/i18n-context.tsx`

When `initialLocale === 'en'` (default) and no cookie is set, check `navigator.language`:
```ts
const initial = initialLocale === DEFAULT_LOCALE && typeof navigator !== 'undefined' && navigator.language.startsWith('zh')
  ? 'zh'
  : initialLocale;
const [locale, setLocaleState] = useState<Locale>(initial);
```

No new strings needed. No DB changes. Cookie already persists choice.

---

### 2. Dark mode manual toggle

**New file:** `apps/web/components/theme-toggle.tsx`

- Sun/moon icon button in `SiteHeader` alongside the language switcher
- Toggle `class` on `<html>` (no Tailwind `darkMode: 'class'` config needed if already set)
- Persist to `localStorage` key `theme` (values: `'light'`, `'dark'`, `'system'`)

**Implementation sketch:**
```tsx
'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const preferred = stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setTheme(preferred ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', preferred);
  }, []);
  const toggle = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };
  return (
    <button onClick={toggle} aria-label="Toggle dark mode" className="...">
      {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
```

Add to `site-header.tsx` next to the language switcher.

---

### 3. Sort dropdown on /projects

**File:** `apps/web/app/projects/page.tsx` + `projects-table.tsx`

Add a sort `<select>` beside the category filter with options:
- GitHub Stars ↓ (default)
- GitHub Stars ↑
- Newest first
- Name A–Z

The select updates `router.push('/projects?sort=stars&dir=desc')`.

**Server-side:** `getAllProjects()` and `getProjectsByCategory()` already accept sort params. Adjust the ORDER BY clause based on query params.

---

### 4. RSS feeds (API routes)

**New files:** `apps/web/app/feed/projects.xml/route.ts`, `apps/web/app/feed/youtube-insights.xml/route.ts`

Return `Content-Type: application/xml` with RSS 2.0 XML. Example layout:
```ts
export async function GET() {
  const projects = await getLatestProjects(50);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Product Tracer — New Projects</title>
    <link>https://product-tracer.vercel.app/projects</link>
    <description>New indie projects tracked across GitHub, HN, PH, YouTube</description>
    ${projects.map(p => `<item>
      <title>${escapeXml(p.name)}</title>
      <link>https://product-tracer.vercel.app/projects/${p.slug}</link>
      <description>${escapeXml(p.one_liner || '')}</description>
      <guid>https://product-tracer.vercel.app/projects/${p.slug}</guid>
    </item>`).join('\n')}
  </channel>
</rss>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
```

---

### Rules
- PR → Vercel preview ✅ → merge to main → verify production
- Only touch apps/web/ files
- pnpm --filter @product-tracer/web typecheck must pass
- Git author: JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>
- No DB changes needed for these (frontend-only fixes)

### After completing
1. Update CHANGELOG.md
2. Delete this file
3. Write summary to assistant-queue/FRONTEND_RESPONSE.md
