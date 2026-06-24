'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n-context';

/**
 * Week picker for /trends. Weeks come from the server (newest first); selecting
 * one navigates to `/trends?week=YYYY-MM-DD` (the latest week uses the clean
 * `/trends` URL). State lives entirely in the URL, so this needs no local state.
 */
export function TrendWeekSelect({
  weeks,
  selected,
  latest,
}: {
  weeks: { week_start: string; week_end: string }[];
  selected: string;
  latest: string;
}) {
  const { t } = useI18n();
  const router = useRouter();

  if (weeks.length <= 1) return null;

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-neutral-500">{t('trends.weekLabel')}</span>
      <select
        value={selected}
        onChange={(e) => {
          const week = e.target.value;
          router.push((week === latest ? '/trends' : `/trends?week=${week}`) as Route);
        }}
        aria-label={t('trends.weekLabel')}
        className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm tabular-nums focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
      >
        {weeks.map((w) => (
          <option key={w.week_start} value={w.week_start}>
            {w.week_start} – {w.week_end}
          </option>
        ))}
      </select>
    </label>
  );
}
