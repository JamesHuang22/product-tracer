import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getVideoInsights, type VideoInsight } from '@/lib/db';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, translate, type Locale } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'YouTube Insights — Product Tracer',
  description: 'A bilingual digest of LLM-analysed YouTube videos — trends, topics, and key takeaways.',
};

// Live data — reflect the latest analysis run on every request.
export const dynamic = 'force-dynamic';

// Whole-digest fetch (no pagination). Generous cap guards against an unbounded
// query if the table ever grows large.
const DIGEST_LIMIT = 200;

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

function DigestCard({ insight, locale }: { insight: VideoInsight; locale: Locale }) {
  const sentiment = insight.sentiment?.toLowerCase() ?? '';
  const dot = SENTIMENT_DOT[sentiment];
  const hot = (insight.relevance_score ?? 0) >= 7;
  const hasMeta = insight.trends.length > 0 || insight.topics.length > 0;
  // Locale-aware: show one paragraph in the active language, falling back to the
  // other if the preferred translation is missing (e.g. zh before migration 0009).
  const text =
    locale === 'zh'
      ? insight.key_insight_zh ?? insight.key_insight
      : insight.key_insight ?? insight.key_insight_zh;

  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
      {text && (
        <p className="text-[15px] leading-relaxed text-neutral-900 dark:text-neutral-100">
          {hot && <span className="mr-1.5" aria-hidden>🔥</span>}
          {text}
        </p>
      )}

      {hasMeta && (
        <div className="mt-3 text-xs text-neutral-400">
          {insight.trends.length > 0 && (
            <span>
              {translate(locale, 'insights.trends')}: {insight.trends.join(', ')}
            </span>
          )}
          {insight.trends.length > 0 && insight.topics.length > 0 && (
            <span className="mx-1.5">·</span>
          )}
          {insight.topics.length > 0 && (
            <span>
              {translate(locale, 'insights.topics')}: {insight.topics.join(', ')}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3 text-xs">
        {dot && (
          <span className="inline-flex items-center gap-1 text-neutral-500">
            <span aria-hidden>{dot}</span>
            <span>{translate(locale, sentimentLabelKey(sentiment))}</span>
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

export default async function YoutubeInsightsPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(raw) ? (raw as Locale) : DEFAULT_LOCALE;

  const insights = await getVideoInsights(DIGEST_LIMIT);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{translate(locale, 'insights.title')}</h1>
        <p className="mt-2 text-sm text-neutral-500">{translate(locale, 'insights.subtitle')}</p>
      </header>

      {insights.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
          {translate(locale, 'insights.empty')}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {insights.map((insight) => (
            <DigestCard key={insight.id} insight={insight} locale={locale} />
          ))}
        </div>
      )}
    </main>
  );
}
