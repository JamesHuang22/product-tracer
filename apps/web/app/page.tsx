import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { getPlatformProjectCount, getPlatformTop } from '@/lib/db';
import {
  ComingSoonSection,
  LivePlatformSection,
  PLATFORM_VISUALS,
} from '@/components/platform-section';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Fetch all live platforms in parallel.
  const [ghTop, hnTop, ghCount, hnCount] = await Promise.all([
    getPlatformTop('github', 5),
    getPlatformTop('hacker_news', 5),
    getPlatformProjectCount('github'),
    getPlatformProjectCount('hacker_news'),
  ]);

  const totalLive = ghCount + hnCount;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      {/* Hero */}
      <section className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
          {totalLive.toLocaleString()} projects tracked across 2 platforms
        </span>
        <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          Cross-platform signals
          <br />
          for <span className="text-neutral-500">indie products.</span>
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
          Daily intelligence on what&rsquo;s gaining traction across GitHub, Hacker News, Product
          Hunt, Reddit, and X &mdash; surfaced into a 5-minute morning read.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Browse all projects
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <span className="text-sm text-neutral-500">
            Daily email digest &middot; <span className="text-neutral-400">coming soon</span>
          </span>
        </div>
      </section>

      {/* Platform sections */}
      <section className="mt-16">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">By platform</h2>
          <span className="text-xs tabular-nums text-neutral-500">
            2 live &middot; 3 coming soon
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <LivePlatformSection visual={PLATFORM_VISUALS.github} count={ghCount} items={ghTop} />

          <LivePlatformSection
            visual={PLATFORM_VISUALS.hacker_news}
            count={hnCount}
            items={hnTop}
          />

          <ComingSoonSection
            visual={PLATFORM_VISUALS.product_hunt}
            description="Daily launches with upvote velocity. Highest indie signal but requires commercial-use approval before public launch."
          />

          <ComingSoonSection
            visual={PLATFORM_VISUALS.reddit}
            description="r/SideProject, r/indiehackers, r/SaaS — early discovery and community signal."
          />

          <ComingSoonSection
            visual={PLATFORM_VISUALS.x}
            description="Founder tweets with traction data &mdash; following a curated watchlist, not the firehose."
          />
        </div>
      </section>
    </main>
  );
}
