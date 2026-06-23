import {
  getActiveSignalCount,
  getLatestProjects,
  getLatestWeeklyTrend,
  getNewThisWeek,
  getPlatformProjectCount,
  getPlatformTop,
  getTopVideoInsights,
  getTotalProjectCount,
} from '@/lib/db';
import { HomeContent } from '@/components/home-content';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from '@/lib/i18n';
import { localizedPair, localizedText } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Fetch all live platforms + overview stats in parallel (server-side); the UI
  // chrome itself is rendered by the client <HomeContent> so it can be localised.
  const [
    ghTop,
    hnTop,
    phTop,
    ytTop,
    ghCount,
    hnCount,
    phCount,
    ytCount,
    totalProjects,
    newThisWeek,
    hotSignals,
    latest,
    videoInsights,
    weeklyTrend,
  ] = await Promise.all([
    getPlatformTop('github', 5),
    getPlatformTop('hacker_news', 5),
    getPlatformTop('product_hunt', 5),
    getPlatformTop('youtube', 5),
    getPlatformProjectCount('github'),
    getPlatformProjectCount('hacker_news'),
    getPlatformProjectCount('product_hunt'),
    getPlatformProjectCount('youtube'),
    getTotalProjectCount(),
    getNewThisWeek(),
    getActiveSignalCount(),
    getLatestProjects(10),
    getTopVideoInsights(3),
    getLatestWeeklyTrend(),
  ]);

  const totalLive = ghCount + hnCount + phCount + ytCount;

  // Resolve each insight to the active locale's summary and drop the other
  // language before handing data to the client <HomeContent>. The rendered card
  // was already single-locale; this also keeps the unused translation out of the
  // serialized RSC payload, so the page *source* carries one language per card.
  // `localizedPair` additionally guards the English case where the "English"
  // column itself holds Chinese (returning null rather than leaking it).
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(rawLocale) ? (rawLocale as Locale) : DEFAULT_LOCALE;
  const localizedInsights = videoInsights.map((vi) => {
    const resolved = localizedPair(locale, vi.key_insight, vi.key_insight_zh);
    return locale === 'zh'
      ? { ...vi, key_insight: null, key_insight_zh: resolved }
      : { ...vi, key_insight: resolved, key_insight_zh: null };
  });

  // One-liners live in a single column that is occasionally Chinese. In English
  // mode, null out predominantly-CJK text *here* (server-side) so it never
  // reaches the client component's serialized props — keeping the page source,
  // not just the rendered text, free of stray Chinese. Applies to the latest
  // feed and every platform top-list (whose one-liners ride along in the payload
  // even though only the name is shown).
  const stripOneLiners = <T extends { one_liner: string | null }>(rows: T[]): T[] =>
    rows.map((r) => ({ ...r, one_liner: localizedText(locale, r.one_liner) }));

  // Collapse the weekly trend to a single-locale overview for the home preview:
  // resolve the summary to the active language (drop the other column from the
  // payload) and keep only the leading top products + themes. The full report
  // lives on /trends. Null when no weekly analysis has run yet.
  const trendOverview = weeklyTrend
    ? {
        weekStart: weeklyTrend.week_start,
        weekEnd: weeklyTrend.week_end,
        summary:
          locale === 'zh'
            ? weeklyTrend.summary_zh || weeklyTrend.summary_en
            : weeklyTrend.summary_en || weeklyTrend.summary_zh,
        topProducts: weeklyTrend.top_products.slice(0, 4),
        emergingThemes: weeklyTrend.emerging_themes.slice(0, 8),
      }
    : null;

  return (
    <HomeContent
      data={{
        totalLive,
        livePlatforms: 4,
        totalProjects,
        newThisWeek,
        hotSignals,
        latest: stripOneLiners(latest),
        videoInsights: localizedInsights,
        github: { count: ghCount, items: stripOneLiners(ghTop) },
        hackerNews: { count: hnCount, items: stripOneLiners(hnTop) },
        productHunt: { count: phCount, items: stripOneLiners(phTop) },
        youtube: { count: ytCount, items: stripOneLiners(ytTop) },
        trend: trendOverview,
      }}
    />
  );
}
