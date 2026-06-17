'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { ArrowUpRight } from 'lucide-react';
import type { VideoInsight } from '@/lib/db';
import { useI18n } from '@/lib/i18n-context';

/** Relevance pill colour ramp: 8–10 green, 5–7 amber, ≤4 neutral. */
function relevanceClass(score: number | null): string {
  if (score == null) return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300';
  if (score >= 8) return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
  if (score >= 5) return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300';
  return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300';
}

const SENTIMENT_STYLE: Record<string, string> = {
  positive: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  neutral: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  negative: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
};

function InsightCard({ insight }: { insight: VideoInsight }) {
  const { t } = useI18n();
  const sentiment = insight.sentiment?.toLowerCase() ?? null;
  const sentimentKey =
    sentiment === 'positive' || sentiment === 'neutral' || sentiment === 'negative'
      ? (`insights.sentiment.${sentiment}` as const)
      : null;
  // Trends lead, then topics — de-duplicated and capped so cards stay tidy.
  const pills = Array.from(new Set([...insight.trends, ...insight.topics]))
    .filter(Boolean)
    .slice(0, 6);

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700 sm:flex-row">
      {insight.thumbnail_url && (
        <a
          href={insight.video_url}
          target="_blank"
          rel="noreferrer"
          className="relative block shrink-0 sm:w-64"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={insight.thumbnail_url}
            alt=""
            loading="lazy"
            className="aspect-video h-full w-full object-cover"
          />
        </a>
      )}

      <div className="flex min-w-0 flex-1 flex-col p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {insight.relevance_score != null && (
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${relevanceClass(insight.relevance_score)}`}
            >
              {t('insights.relevance', { score: insight.relevance_score })}
            </span>
          )}
          {sentimentKey && (
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${SENTIMENT_STYLE[sentiment!]}`}
            >
              {t(sentimentKey)}
            </span>
          )}
          {insight.published_at && (
            <span className="text-xs tabular-nums text-neutral-400">{insight.published_at}</span>
          )}
        </div>

        <h2 className="text-base font-semibold leading-snug tracking-tight">
          <a
            href={insight.video_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-start gap-1 transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
          >
            <span className="line-clamp-2">{insight.video_title}</span>
            <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
          </a>
        </h2>
        <div className="mt-1 truncate text-sm text-neutral-500">{insight.channel_title}</div>

        {insight.key_insight && (
          <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
            {insight.key_insight}
          </p>
        )}

        {pills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pills.map((p) => (
              <span
                key={p}
                className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
              >
                {p}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export function VideoInsightsList({
  insights,
  page,
  pageCount,
  total,
  pageSize,
}: {
  insights: VideoInsight[];
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
}) {
  const { t } = useI18n();

  if (total === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
        {t('insights.empty')}
      </div>
    );
  }

  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);
  const hrefFor = (p: number) => (p <= 1 ? '/youtube-insights' : `/youtube-insights?page=${p}`);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4">
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>

      {pageCount > 1 && (
        <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <span className="text-xs tabular-nums text-neutral-500">
            {t('table.pagination.showing', { start: rangeStart, end: rangeEnd, total })}
          </span>
          <div className="flex items-center gap-2 text-xs">
            {page > 1 ? (
              <Link
                href={hrefFor(page - 1) as Route}
                className="rounded-md border border-neutral-300 px-2.5 py-1 font-medium transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
              >
                {t('table.pagination.prev')}
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-md border border-neutral-300 px-2.5 py-1 font-medium opacity-40 dark:border-neutral-700">
                {t('table.pagination.prev')}
              </span>
            )}
            <span className="tabular-nums text-neutral-500">
              {t('table.pagination.page', { current: page, total: pageCount })}
            </span>
            {page < pageCount ? (
              <Link
                href={hrefFor(page + 1) as Route}
                className="rounded-md border border-neutral-300 px-2.5 py-1 font-medium transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
              >
                {t('table.pagination.next')}
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-md border border-neutral-300 px-2.5 py-1 font-medium opacity-40 dark:border-neutral-700">
                {t('table.pagination.next')}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
