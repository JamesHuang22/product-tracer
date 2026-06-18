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
 * Top-of-page controls for /youtube-insights: a category dropdown and a
 * List/Grid view toggle. State lives entirely in the URL (`?category=`,
 * `?view=`); changing either resets pagination (drops `?page=`). Current
 * `view`/`category` are passed from the server so this needs no useSearchParams.
 */
export function InsightsControls({
  view,
  category,
  categoryOptions,
  allLabel,
  allCount,
}: {
  view: 'list' | 'grid';
  category: string | null;
  categoryOptions: CategoryOption[];
  allLabel: string;
  allCount: number;
}) {
  const { t } = useI18n();
  const router = useRouter();

  const hrefFor = (next: { view?: 'list' | 'grid'; category?: string | null }): Route => {
    const v = next.view ?? view;
    const c = next.category === undefined ? category : next.category;
    const params = new URLSearchParams();
    if (v === 'grid') params.set('view', 'grid');
    if (c) params.set('category', c);
    const qs = params.toString();
    return (qs ? `/youtube-insights?${qs}` : '/youtube-insights') as Route;
  };

  const toggleBase =
    'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors';
  const toggleActive = 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900';
  const toggleIdle = 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100';

  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <select
        value={category ?? ''}
        onChange={(e) => router.push(hrefFor({ category: e.target.value || null }))}
        aria-label={allLabel}
        className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
      >
        <option value="">
          {allLabel}
          {allCount ? ` (${allCount})` : ''}
        </option>
        {categoryOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
            {o.count ? ` (${o.count})` : ''}
          </option>
        ))}
      </select>

      <div className="inline-flex shrink-0 overflow-hidden rounded-md border border-neutral-300 dark:border-neutral-700">
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
