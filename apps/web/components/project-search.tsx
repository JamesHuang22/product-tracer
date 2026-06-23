'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import { Loader2, Search, Star } from 'lucide-react';
import type { ProjectSearchResult } from '@/lib/db';
import { cleanOneLiner, fmtCount, localizedText } from '@/lib/format';
import { useI18n } from '@/lib/i18n-context';

/**
 * Global fuzzy project search (pg_trgm via /api/search). Debounced 300ms, shows
 * a dropdown of up to 20 hits while typing, each linking to the detail page.
 * Searches the whole corpus — independent of the table's client-side filter,
 * which only matches the rows already loaded for the current sort/page.
 */
export function ProjectSearch() {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProjectSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced fetch: wait 300ms after the last keystroke, and ignore stale
  // responses (a slower earlier request resolving after a later one) via the
  // `cancelled` flag tied to this effect run.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { results?: ProjectSearchResult[] };
        if (!cancelled) setResults(data.results ?? []);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query]);

  // Close the dropdown on outside click.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder={t('search.placeholder')}
          aria-label={t('search.placeholder')}
          className="w-full rounded-md border border-neutral-300 bg-white py-2 pl-9 pr-9 text-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
        />
        {loading && (
          <Loader2
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-400"
            aria-hidden
          />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-20 mt-2 max-h-96 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {results.length === 0 && !loading ? (
            <div className="px-3 py-4 text-center text-sm text-neutral-500">
              {t('search.noResults', { query: query.trim() })}
            </div>
          ) : (
            results.map((r) => {
              const oneLiner = localizedText(locale, cleanOneLiner(r.one_liner));
              return (
                <Link
                  key={r.slug}
                  href={`/projects/${r.slug}` as Route}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-3 px-3 py-2 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                      {r.name}
                    </span>
                    {oneLiner && (
                      <span className="block truncate text-xs text-neutral-500">{oneLiner}</span>
                    )}
                  </span>
                  {r.stars != null && (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs tabular-nums text-neutral-500">
                      <Star className="h-3 w-3" aria-hidden />
                      {fmtCount(r.stars)}
                    </span>
                  )}
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
