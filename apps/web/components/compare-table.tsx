import Link from 'next/link';
import type { Route } from 'next';
import { ArrowUpRight, Star } from 'lucide-react';
import type { ProjectListItem } from '@/lib/db';
import { fmtCount, cleanOneLiner, localizedText } from '@/lib/format';
import { translate, type Locale, type MessageKey } from '@/lib/i18n';
import { CategoryBadge } from '@/components/category-badge';

const PLATFORM_LABEL: Record<string, string> = {
  github: 'GitHub',
  hacker_news: 'Hacker News',
  product_hunt: 'Product Hunt',
  youtube: 'YouTube',
  reddit: 'Reddit',
  x: 'X',
};

/**
 * Side-by-side comparison of 2–3 products (TASK-020). A server component — the
 * data is fixed per request. Each product is a column; fields render in the
 * same order down every column so they read across as a comparison.
 */
export function CompareTable({
  projects,
  locale,
}: {
  projects: ProjectListItem[];
  locale: Locale;
}) {
  const tr = (key: MessageKey) => translate(locale, key);
  const fieldLabel = 'text-[11px] font-semibold uppercase tracking-wider text-neutral-400';

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => {
        const oneLiner = localizedText(locale, cleanOneLiner(p.one_liner));
        const platforms = (p.platforms ?? []).filter((x) => PLATFORM_LABEL[x]);
        const net = (p.upvotes ?? 0) - (p.downvotes ?? 0);
        return (
          <div
            key={p.id}
            className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-none"
          >
            <div>
              <Link
                href={`/projects/${p.slug}` as Route}
                className="inline-flex items-center gap-1.5 text-lg font-semibold tracking-tight hover:underline"
              >
                {p.name}
                <ArrowUpRight className="h-4 w-4 text-neutral-400" aria-hidden />
              </Link>
              <div className="mt-2">
                {p.llm_category ? (
                  <CategoryBadge category={p.llm_category} />
                ) : (
                  <span className="text-sm text-neutral-400">—</span>
                )}
              </div>
            </div>

            <div>
              <div className={fieldLabel}>{tr('compare.row.description')}</div>
              <p className="mt-1 text-sm leading-[1.6] text-neutral-600 dark:text-neutral-400">
                {oneLiner ?? '—'}
              </p>
            </div>

            <div>
              <div className={fieldLabel}>{tr('table.header.stars')}</div>
              <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium tabular-nums">
                <Star className="h-3.5 w-3.5 text-amber-500" aria-hidden />
                {fmtCount(p.github_stars)}
              </p>
            </div>

            <div>
              <div className={fieldLabel}>{tr('compare.row.platforms')}</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {platforms.length > 0 ? (
                  platforms.map((x) => (
                    <span
                      key={x}
                      className="rounded-full border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600 dark:border-neutral-700 dark:text-neutral-300"
                    >
                      {PLATFORM_LABEL[x]}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-neutral-400">—</span>
                )}
              </div>
            </div>

            <div>
              <div className={fieldLabel}>{tr('compare.row.votes')}</div>
              <p
                className={`mt-1 text-sm font-medium tabular-nums ${
                  net > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : net < 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-neutral-500'
                }`}
              >
                {net > 0 ? `+${fmtCount(net)}` : fmtCount(net)}
              </p>
            </div>

            <div>
              <div className={fieldLabel}>{tr('compare.row.created')}</div>
              <p className="mt-1 text-sm tabular-nums text-neutral-600 dark:text-neutral-400">
                {p.created_at}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
