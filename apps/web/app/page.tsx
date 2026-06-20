import {
  getActiveSignalCount,
  getLatestProjects,
  getNewThisWeek,
  getPlatformProjectCount,
  getPlatformTop,
  getTopVideoInsights,
  getTotalProjectCount,
} from '@/lib/db';
import { HomeContent } from '@/components/home-content';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from '@/lib/i18n';

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
  ]);

  const totalLive = ghCount + hnCount + phCount + ytCount;

  // Resolve each insight to the active locale's summary and drop the other
  // language before handing data to the client <HomeContent>. The rendered card
  // was already single-locale; this also keeps the unused translation out of the
  // serialized RSC payload, so the page *source* carries one language per card.
  const cookieStore = await cookies();
  const rawLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(rawLocale) ? (rawLocale as Locale) : DEFAULT_LOCALE;
  const localizedInsights = videoInsights.map((vi) => {
    const resolved =
      locale === 'zh' ? vi.key_insight_zh ?? vi.key_insight : vi.key_insight ?? vi.key_insight_zh;
    return locale === 'zh'
      ? { ...vi, key_insight: null, key_insight_zh: resolved }
      : { ...vi, key_insight: resolved, key_insight_zh: null };
  });

  return (
    <HomeContent
      data={{
        totalLive,
        livePlatforms: 4,
        totalProjects,
        newThisWeek,
        hotSignals,
        latest,
        videoInsights: localizedInsights,
        github: { count: ghCount, items: ghTop },
        hackerNews: { count: hnCount, items: hnTop },
        productHunt: { count: phCount, items: phTop },
        youtube: { count: ytCount, items: ytTop },
      }}
    />
  );
}
