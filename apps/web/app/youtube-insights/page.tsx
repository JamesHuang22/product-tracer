import type { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { cookies } from 'next/headers';
import {
  getVideoInsightsByCategories,
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
import { localizedPair, localizedText } from '@/lib/format';
import { InsightsControls, type CategoryOption } from './insights-controls';

const OG_TITLE = 'YouTube Insights — OpenProduct';
const OG_DESCRIPTION =
  'A bilingual digest of LLM-analysed YouTube videos — key takeaways by category.';

// Content is the same for every visitor (no per-insight pages), so a static
// metadata object with Open Graph + Twitter cards is enough — both point at the
// dynamic /og/youtube-insights image so shared links preview with a branded card.
export const metadata: Metadata = {
  title: OG_TITLE,
  description: OG_DESCRIPTION,
  openGraph: {
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    url: '/youtube-insights',
    siteName: 'OpenProduct',
    type: 'website',
    images: [
      {
        url: '/og/youtube-insights',
        width: 1200,
        height: 630,
        alt: 'OpenProduct — YouTube Insights',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: OG_TITLE,
    description: OG_DESCRIPTION,
    images: ['/og/youtube-insights'],
  },
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
  // Locale-aware: one paragraph in the active language. In English mode we never
  // fall back to the Chinese column (and drop the English one if it actually
  // holds Chinese), so the EN UI stays free of stray Chinese.
  const insightText = localizedPair(locale, insight.key_insight, insight.key_insight_zh);
  // Never leave a card textless. When the AI summary is missing — or gets
  // suppressed because EN mode drops a Chinese-only key_insight — fall back to
  // the video title, then to a muted "analysis pending" note. The title is run
  // through localizedText so a Chinese title is itself dropped in EN mode rather
  // than leaking CJK into the EN UI (TASK-028 safety net) — better an honest
  // "analysis pending" than stray Chinese in an English card.
  const fallbackTitle = localizedText(locale, insight.video_title?.trim() || null);
  const text = insightText ?? fallbackTitle;
  const isFallback = !insightText;

  return (
    <article
      className={`flex h-full flex-col rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 ${compact ? 'p-4' : 'p-5'}`}
    >
      {text ? (
        <p
          className={`text-[15px] leading-relaxed ${isFallback ? 'text-neutral-600 dark:text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'} ${compact ? 'line-clamp-4' : ''}`}
        >
          {hot && !isFallback && (
            <span className="mr-1.5" aria-hidden>
              🔥
            </span>
          )}
          {text}
        </p>
      ) : (
        <p className="text-[15px] italic leading-relaxed text-neutral-400 dark:text-neutral-500">
          {translate(locale, 'insights.analysisPending')}
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
  // `?category=` is a comma-separated multi-select. Parse → dedupe → keep only
  // known category values (drops junk / stale params), preserving canonical order.
  const validCategoryValues = new Set(INSIGHT_CATEGORIES.map((c) => c.value));
  const selectedCategories = INSIGHT_CATEGORIES.map((c) => c.value).filter((v) =>
    new Set(
      (categoryParam ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => validCategoryValues.has(s)),
    ).has(v),
  );

  const [total, categoryCounts] = await Promise.all([
    getVideoInsightCount(selectedCategories),
    getVideoInsightCategories(),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const parsed = Number.parseInt(pageParam ?? '1', 10);
  const page = Number.isNaN(parsed) ? 1 : Math.min(Math.max(parsed, 1), pageCount);
  const offset = (page - 1) * PAGE_SIZE;

  const fetched =
    total === 0 ? [] : await getVideoInsightsByCategories(selectedCategories, PAGE_SIZE, offset);

  // Last-resort circuit breaker (TASK-028-REV): in EN locale, drop any card that
  // has no English-displayable text — i.e. its insight is CJK/empty AND its title
  // is CJK/empty. The DB-level LLM audit should already remove non-tech content,
  // so this rarely fires; it guarantees the EN UI never shows a Chinese-only card.
  const insights =
    locale === 'en'
      ? fetched.filter(
          (i) =>
            localizedPair('en', i.key_insight, i.key_insight_zh) !== null ||
            localizedText('en', i.video_title) !== null,
        )
      : fetched;

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
    if (selectedCategories.length > 0) params.set('category', selectedCategories.join(','));
    if (p > 1) params.set('page', String(p));
    const qs = params.toString();
    return (qs ? `/youtube-insights?${qs}` : '/youtube-insights') as Route;
  };

  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + PAGE_SIZE, total);

  return (
    // Grid view needs room for four columns, so it gets a wider container; the
    // list view stays at a comfortable reading width.
    <main className={`mx-auto px-6 py-12 ${view === 'grid' ? 'max-w-6xl' : 'max-w-3xl'}`}>
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">{translate(locale, 'insights.title')}</h1>
        <p className="mt-2 text-sm text-neutral-500">{translate(locale, 'insights.subtitle')}</p>
      </header>

      <InsightsControls
        view={view}
        selected={selectedCategories}
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
          className={
            view === 'grid'
              ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'
              : 'flex flex-col gap-4'
          }
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
