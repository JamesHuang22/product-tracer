import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { getVideoInsights, getVideoInsightCount } from '@/lib/db';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, translate } from '@/lib/i18n';
import { VideoInsightsList } from './video-insights-list';

export const metadata: Metadata = {
  title: 'YouTube Insights — Product Tracer',
  description: 'LLM-analysed YouTube videos — trends, topics, sentiment, and indie-dev/AI relevance.',
};

// Live data — reflect the latest analysis run on every request.
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;

export default async function YoutubeInsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(raw) ? (raw as 'en' | 'zh') : DEFAULT_LOCALE;

  const total = await getVideoInsightCount();
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Clamp the requested page into [1, pageCount] so a hand-edited ?page= never
  // queries a negative offset or an empty tail page.
  const parsed = Number.parseInt(pageParam ?? '1', 10);
  const page = Number.isNaN(parsed) ? 1 : Math.min(Math.max(parsed, 1), pageCount);

  const insights = total === 0 ? [] : await getVideoInsights(PAGE_SIZE, (page - 1) * PAGE_SIZE);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{translate(locale, 'insights.title')}</h1>
        <p className="mt-2 text-sm text-neutral-500">
          {translate(locale, 'insights.subtitle', { count: total })}
        </p>
      </header>
      <VideoInsightsList
        insights={insights}
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={PAGE_SIZE}
      />
    </main>
  );
}
