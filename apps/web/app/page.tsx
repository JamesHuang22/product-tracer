import {
  getActiveSignalCount,
  getLatestProjects,
  getNewThisWeek,
  getPlatformProjectCount,
  getPlatformTop,
  getTotalProjectCount,
} from '@/lib/db';
import { HomeContent } from '@/components/home-content';

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
  ]);

  const totalLive = ghCount + hnCount + phCount + ytCount;

  return (
    <HomeContent
      data={{
        totalLive,
        livePlatforms: 4,
        totalProjects,
        newThisWeek,
        hotSignals,
        latest,
        github: { count: ghCount, items: ghTop },
        hackerNews: { count: hnCount, items: hnTop },
        productHunt: { count: phCount, items: phTop },
        youtube: { count: ytCount, items: ytTop },
      }}
    />
  );
}
