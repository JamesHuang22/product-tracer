'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';

export interface CategoryOption {
  value: string;
  label: string;
  count: number;
}

/**
 * Top-of-page controls for /youtube-insights: a multi-select category filter
 * (toggle chips) and a List/Grid view toggle. State lives entirely in the URL
 * (`?category=a,b,c`, `?view=`); changing either resets pagination (drops
 * `?page=`). `selected`/`view` are passed from the server, so this needs no
 * useSearchParams. Toggling a category adds/removes it from the set; "All"
 * clears the filter.
 */
export function InsightsControls({
  view,
  selected,
  categoryOptions,
  allLabel,
  allCount,
}: {
  view: 'list' | 'grid';
  selected: string[];
  categoryOptions: CategoryOption[];
  allLabel: string;
  allCount: number;
}) {
  const { t } = useI18n();
  const router = useRouter();

  const hrefFor = (next: { view?: 'list' | 'grid'; categories?: string[] }): Route => {
    const v = next.view ?? view;
    const cats = next.categories ?? selected;
    const params = new URLSearchParams();
    if (v === 'grid') params.set('view', 'grid');
    if (cats.length > 0) params.set('category', cats.join(','));
    const qs = params.toString();
    return (qs ? `/youtube-insights?${qs}` : '/youtube-insights') as Route;
  };

  const toggleCategory = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((c) => c !== value)
      : [...selected, value];
    router.push(hrefFor({ categories: next }));
  };

  const chipBase =
    'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors';
  const chipActive =
    'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900';
  const chipIdle =
    'border-neutral-300 text-neutral-600 hover:border-neutral-500 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:border-neutral-500 dark:hover:text-neutral-100';

  const toggleBase =
    'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors';
  const toggleActive = 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900';
  const toggleIdle = 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100';

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-wrap gap-1.5">
        {/* "All" clears the multi-select (navigates to no category param). */}
        <Link
          href={hrefFor({ categories: [] })}
          aria-pressed={selected.length === 0}
          className={`${chipBase} ${selected.length === 0 ? chipActive : chipIdle}`}
        >
          {allLabel}
          {allCount ? ` (${allCount})` : ''}
        </Link>
        {categoryOptions.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggleCategory(o.value)}
              aria-pressed={active}
              className={`${chipBase} ${active ? chipActive : chipIdle}`}
            >
              {o.label}
              {o.count ? ` (${o.count})` : ''}
            </button>
          );
        })}
      </div>

      <div className="inline-flex shrink-0 self-start overflow-hidden rounded-md border border-neutral-300 dark:border-neutral-700">
        <Link
          href={hrefFor({ view: 'list' })}
          className={`${toggleBase} ${view === 'list' ? toggleActive : toggleIdle}`}
          aria-current={view === 'list' ? 'true' : undefined}
        >
          <span aria-hidden>☰</span>
          {t('insights.viewList')}
        </Link>
        <Link
          href={hrefFor({ view: 'grid' })}
          className={`${toggleBase} border-l border-neutral-300 dark:border-neutral-700 ${view === 'grid' ? toggleActive : toggleIdle}`}
          aria-current={view === 'grid' ? 'true' : undefined}
        >
          <span aria-hidden>⊞</span>
          {t('insights.viewGrid')}
        </Link>
      </div>
    </div>
  );
}
