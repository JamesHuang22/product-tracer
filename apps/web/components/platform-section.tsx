'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import type { PlatformTopItem } from '@/lib/db';
import { fmtCount } from '@/lib/format';
import { useI18n } from '@/lib/i18n-context';
import type { MessageKey } from '@/lib/i18n';

/** Visual identity for each platform — restrained brand-adjacent monograms. */
export interface PlatformVisual {
  name: string;
  monogram: string; // 1–2 chars displayed in the badge
  monogramBg: string; // tailwind bg class
  monogramFg: string; // tailwind text class
}

export const PLATFORM_VISUALS = {
  github: {
    name: 'GitHub',
    monogram: 'GH',
    monogramBg: 'bg-neutral-900 dark:bg-neutral-100',
    monogramFg: 'text-white dark:text-neutral-900',
  },
  hacker_news: {
    name: 'Hacker News',
    monogram: 'Y',
    monogramBg: 'bg-orange-500',
    monogramFg: 'text-white',
  },
  product_hunt: {
    name: 'Product Hunt',
    monogram: 'PH',
    monogramBg: 'bg-red-500',
    monogramFg: 'text-white',
  },
  youtube: {
    name: 'YouTube',
    monogram: 'YT',
    monogramBg: 'bg-red-600',
    monogramFg: 'text-white',
  },
  reddit: {
    name: 'Reddit',
    monogram: 'R',
    monogramBg: 'bg-orange-600',
    monogramFg: 'text-white',
  },
  x: {
    name: 'X',
    monogram: 'X',
    monogramBg: 'bg-black dark:bg-white',
    monogramFg: 'text-white dark:text-black',
  },
} as const satisfies Record<string, PlatformVisual>;

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

/** Brand monogram badge. `sm` is used inline (e.g. hero source chips). */
export function Monogram({ visual, size = 'md' }: { visual: PlatformVisual; size?: 'sm' | 'md' }) {
  const dims = size === 'sm' ? 'h-5 w-5 rounded text-[9px]' : 'h-7 w-7 rounded-md text-[10px]';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center font-bold tracking-tight ${dims} ${visual.monogramBg} ${visual.monogramFg}`}
    >
      {visual.monogram}
    </span>
  );
}

/** Maps a platform's raw metric label to a localised unit word. */
const METRIC_UNIT_KEY: Record<string, MessageKey> = {
  stars: 'detail.stars',
  score: 'detail.points',
  upvotes: 'detail.upvotes',
  views: 'detail.views',
};

function StatusBadge({ live }: { live: boolean }) {
  const { t } = useI18n();
  if (live) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
        <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
        {t('platform.live')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
      <span className="inline-block size-1.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
      {t('platform.comingSoon')}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Live section — real data from getPlatformTop()
// ---------------------------------------------------------------------------

export function LivePlatformSection({
  visual,
  count,
  items,
  viewAllHref = '/projects',
}: {
  visual: PlatformVisual;
  count: number;
  items: PlatformTopItem[];
  /** Where "View all …" links. Defaults to the combined /projects list. */
  viewAllHref?: Route;
}) {
  const { t } = useI18n();
  const unitLabel = items[0] ? t(METRIC_UNIT_KEY[items[0].metric_label] ?? 'detail.stars') : null;
  return (
    <section className="flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-5 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Monogram visual={visual} />
          <div>
            <div className="font-semibold tracking-tight">{visual.name}</div>
            <div className="mt-0.5 text-xs tabular-nums text-neutral-500">
              {count === 1
                ? t('platform.oneProject')
                : t('platform.projectsTracked', { count: fmtCount(count) })}
            </div>
          </div>
        </div>
        <StatusBadge live />
      </header>

      {items.length > 0 ? (
        <>
          <div className="mb-1.5 flex items-center justify-between px-1 text-[10px] font-medium uppercase tracking-wide text-neutral-400">
            <span>{t('platform.topProjects')}</span>
            {unitLabel && <span>{t('platform.rankedBy', { metric: unitLabel })}</span>}
          </div>
          <ol className="-mx-1 space-y-0.5">
            {items.map((p, i) => (
              <li key={p.id}>
                {p.primary_url ? (
                  <a
                    href={p.primary_url}
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-baseline gap-2 rounded-md px-1 py-1.5 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  >
                    <RowContent item={p} index={i} />
                    <ArrowUpRight className="h-3 w-3 shrink-0 self-center text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-neutral-600" />
                  </a>
                ) : (
                  <div className="flex items-baseline gap-2 px-1 py-1.5">
                    <RowContent item={p} index={i} />
                    <span className="h-3 w-3 shrink-0" aria-hidden />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className="px-1 py-1.5 text-xs text-neutral-400">{t('platform.empty')}</p>
      )}

      <footer className="mt-4 border-t border-neutral-200 pt-3 dark:border-neutral-800">
        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1 text-xs font-medium text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50"
        >
          {t('platform.viewAll', { platform: visual.name })}
          <ArrowRight className="h-3 w-3" />
        </Link>
      </footer>
    </section>
  );
}

function RowContent({ item, index }: { item: PlatformTopItem; index: number }) {
  return (
    <>
      <span className="w-4 shrink-0 text-right font-mono text-[10px] tabular-nums text-neutral-400">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
      <span className="shrink-0 text-xs tabular-nums text-neutral-500">
        {fmtCount(item.metric)}
      </span>
    </>
  );
}

// ---------------------------------------------------------------------------
// Coming-soon section — placeholder for PH / Reddit / X
// ---------------------------------------------------------------------------

export function ComingSoonSection({
  visual,
  descriptionKey,
}: {
  visual: PlatformVisual;
  descriptionKey: MessageKey;
}) {
  const { t } = useI18n();
  return (
    <section className="flex h-full flex-col rounded-xl border border-dashed border-neutral-300 bg-neutral-50/50 p-5 dark:border-neutral-700 dark:bg-neutral-900/30">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Monogram visual={visual} />
          <div>
            <div className="font-semibold tracking-tight text-neutral-700 dark:text-neutral-300">
              {visual.name}
            </div>
            <div className="mt-0.5 text-xs text-neutral-400">{t('platform.notYetIntegrated')}</div>
          </div>
        </div>
        <StatusBadge live={false} />
      </header>

      <p className="mb-4 text-sm leading-relaxed text-neutral-500">{t(descriptionKey)}</p>

      <div className="mt-auto space-y-1.5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2 rounded-md px-1 py-1.5" aria-hidden>
            <span className="block h-2 w-4 shrink-0 rounded bg-neutral-200 dark:bg-neutral-800" />
            <span className="block h-2 flex-1 rounded bg-neutral-200 dark:bg-neutral-800" />
            <span className="block h-2 w-8 shrink-0 rounded bg-neutral-200 dark:bg-neutral-800" />
          </div>
        ))}
      </div>
    </section>
  );
}
