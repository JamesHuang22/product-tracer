import type { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { cookies } from 'next/headers';
import {
  getVideoInsights,
  getVideoInsightsByCategory,
  getVideoInsightCount,
  getVideoInsightCategories,
  type VideoInsight,
} from '@/lib/db';
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  translate,
  type Locale,
  type MessageKey,
} from '@/lib/i18n';
import { InsightsControls, type CategoryOption } from './insights-controls';

export const metadata: Metadata = {
  title: 'YouTube Insights — Product Tracer',
  description: 'A bilingual digest of LLM-analysed YouTube videos — key takeaways by category.',
};

// Live data — reflect the latest analysis run on every request.
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

/** Canonical insight categories (mirrors the backend `category` values) paired
 * with their i18n label keys. Drives both the filter dropdown and card badges. */
const INSIGHT_CATEGORIES: { value: string; key: MessageKey }[] = [
  { value: 'ai_ml', key: 'insights.categoryAiMl' },
  { value: 'developer_tools', key: 'insights.categoryDevTools' },
  { value: 'startup_business', key: 'insights.categoryStartup' },
  { value: 'tech_news', key: 'insights.categoryTechNews' },
  { value: 'hardware', key: 'insights.categoryHardware' },
  { value: 'security', key: 'insights.categorySecurity' },
  { value: 'design', key: 'insights.categoryDesign' },
  { value: 'other', key: 'insights.categoryOther' },
];

/** Sentiment → coloured dot. Unknown/missing sentiment renders no indicator. */
const SENTIMENT_DOT: Record<string, string> = {
  positive: '🟢',
  neutral: '🟡',
  negative: '🔴',
};

function sentimentLabelKey(sentiment: string) {
  if (sentiment === 'positive') return 'insights.sentimentPositive' as const;
  if (sentiment === 'neutral') return 'insights.sentimentNeutral' as const;
  return 'insights.sentimentNegative' as const;
}

function DigestCard({
  insight,
  locale,
  compact,
  categoryLabel,
}: {
  insight: VideoInsight;
  locale: Locale;
  compact: boolean;
  categoryLabel: string | null;
}) {
  const sentiment = insight.sentiment?.toLowerCase() ?? '';
  const dot = SENTIMENT_DOT[sentiment];
  const hot = (insight.relevance_score ?? 0) >= 7;
  // Locale-aware: one paragraph in the active language, falling back to the
  // other if the preferred translation is missing.
  const text =
    locale === 'zh'
      ? insight.key_insight_zh ?? insight.key_insight
      : insight.key_insight ?? insight.key_insight_zh;

  return (
    <article
      className={`flex h-full flex-col rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 ${compact ? 'p-4' : 'p-5'}`}
    >
      {text && (
        <p
          className={`text-[15px] leading-relaxed text-neutral-900 dark:text-neutral-100 ${compact ? 'line-clamp-4' : ''}`}
        >
          {hot && <span className="mr-1.5" aria-hidden>🔥</span>}
          {text}
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-3 pt-3 text-xs">
        {dot && (
          <span className="inline-flex items-center gap-1 text-neutral-500">
            <span aria-hidden>{dot}</span>
            <span>{translate(locale, sentimentLabelKey(sentiment))}</span>
          </span>
        )}
        {categoryLabel && (
          <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
            {categoryLabel}
          </span>
        )}
        <a
          href={insight.video_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-neutral-400 transition-colors hover:text-neutral-700 dark:hover:text-neutral-200"
        >
          <span aria-hidden>▶</span>
          {translate(locale, 'insights.watchOn')}
        </a>
      </div>
    </article>
  );
}

export default async function YoutubeInsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; category?: string; page?: string }>;
}) {
  const { view: viewParam, category: categoryParam, page: pageParam } = await searchParams;
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(raw) ? (raw as Locale) : DEFAULT_LOCALE;

  const view: 'list' | 'grid' = viewParam === 'grid' ? 'grid' : 'list';
  const category =
    typeof categoryParam === 'string' && categoryParam.length > 0 ? categoryParam : null;

  const [total, categoryCounts] = await Promise.all([
    getVideoInsightCount(category ?? undefined),
    getVideoInsightCategories(),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const parsed = Number.parseInt(pageParam ?? '1', 10);
  const page = Number.isNaN(parsed) ? 1 : Math.min(Math.max(parsed, 1), pageCount);
  const offset = (page - 1) * PAGE_SIZE;

  const insights =
    total === 0
      ? []
      : category
        ? await getVideoInsightsByCategory(category, PAGE_SIZE, offset)
        : await getVideoInsights(PAGE_SIZE, offset);

  // Dropdown options (fixed canonical set) annotated with live counts; the "All"
  // count is the unfiltered total across every category bucket.
  const countByValue = new Map(categoryCounts.map((c) => [c.category, c.cnt]));
  const allCount = categoryCounts.reduce((sum, c) => sum + c.cnt, 0);
  const categoryOptions: CategoryOption[] = INSIGHT_CATEGORIES.map((c) => ({
    value: c.value,
    label: translate(locale, c.key),
    count: countByValue.get(c.value) ?? 0,
  }));
  const labelForCategory = (value: string | null): string | null => {
    if (!value) return null;
    const match = INSIGHT_CATEGORIES.find((c) => c.value === value);
    return match ? translate(locale, match.key) : value;
  };

  const pageHref = (p: number): Route => {
    const params = new URLSearchParams();
    if (view === 'grid') params.set('view', 'grid');
    if (category) params.set('category', category);
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return (qs ? `/youtube-insights?${qs}` : '/youtube-insights') as Route;
  };

  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + PAGE_SIZE, total);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">{translate(locale, 'insights.title')}</h1>
        <p className="mt-2 text-sm text-neutral-500">{translate(locale, 'insights.subtitle')}</p>
      </header>

      <InsightsControls
        view={view}
        category={category}
        categoryOptions={categoryOptions}
        allLabel={translate(locale, 'insights.categoryAll')}
        allCount={allCount}
      />

      {insights.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
          {translate(locale, 'insights.empty')}
        </div>
      ) : (
        <div
          className={view === 'grid' ? 'grid grid-cols-1 gap-4 sm:grid-cols-2' : 'flex flex-col gap-4'}
        >
          {insights.map((insight) => (
            <DigestCard
              key={insight.id}
              insight={insight}
              locale={locale}
              compact={view === 'grid'}
              categoryLabel={labelForCategory(insight.category)}
            />
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <div className="mt-6 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <span className="text-xs tabular-nums text-neutral-500">
            {translate(locale, 'table.pagination.showing', {
              start: rangeStart,
              end: rangeEnd,
              total,
            })}
          </span>
          <div className="flex items-center gap-2 text-xs">
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className="rounded-md border border-neutral-300 px-2.5 py-1 font-medium transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
              >
                {translate(locale, 'table.pagination.prev')}
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-md border border-neutral-300 px-2.5 py-1 font-medium opacity-40 dark:border-neutral-700">
                {translate(locale, 'table.pagination.prev')}
              </span>
            )}
            <span className="tabular-nums text-neutral-500">
              {translate(locale, 'table.pagination.page', { current: page, total: pageCount })}
            </span>
            {page < pageCount ? (
              <Link
                href={pageHref(page + 1)}
                className="rounded-md border border-neutral-300 px-2.5 py-1 font-medium transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:hover:bg-neutral-900"
              >
                {translate(locale, 'table.pagination.next')}
              </Link>
            ) : (
              <span className="cursor-not-allowed rounded-md border border-neutral-300 px-2.5 py-1 font-medium opacity-40 dark:border-neutral-700">
                {translate(locale, 'table.pagination.next')}
              </span>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
