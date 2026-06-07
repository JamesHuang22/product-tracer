'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { PlatformTopItem } from '@/lib/db';
import { useI18n } from '@/lib/i18n-context';
import {
  ComingSoonSection,
  LivePlatformSection,
  PLATFORM_VISUALS,
} from '@/components/platform-section';

export interface HomeData {
  totalLive: number;
  livePlatforms: number;
  comingSoon: number;
  github: { count: number; items: PlatformTopItem[] };
  hackerNews: { count: number; items: PlatformTopItem[] };
  productHunt: { count: number; items: PlatformTopItem[] };
  youtube: { count: number; items: PlatformTopItem[] };
}

/**
 * All home-page chrome lives here as a client component so every string flows
 * through `useI18n()` and re-renders instantly on locale toggle. Data is
 * fetched server-side in `page.tsx` and handed down as props (never translated).
 */
export function HomeContent({ data }: { data: HomeData }) {
  const { t } = useI18n();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 sm:py-16">
      {/* Hero */}
      <section className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
          {t('hero.badge', {
            count: data.totalLive.toLocaleString(),
            platforms: data.livePlatforms,
          })}
        </span>
        <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          {t('hero.titleLine1')}
          <br />
          {t('hero.titleLead')}
          <span className="text-neutral-500">{t('hero.titleAccent')}</span>
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
          {t('hero.subtitle')}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            {t('hero.browseAll')}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <span className="text-sm text-neutral-500">
            {t('hero.dailyEmail')} &middot;{' '}
            <span className="text-neutral-400">{t('hero.comingSoon')}</span>
          </span>
        </div>
      </section>

      {/* Platform sections */}
      <section className="mt-16">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">{t('byPlatform.title')}</h2>
          <span className="text-xs tabular-nums text-neutral-500">
            {t('byPlatform.summary', { live: data.livePlatforms, soon: data.comingSoon })}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <LivePlatformSection
            visual={PLATFORM_VISUALS.github}
            count={data.github.count}
            items={data.github.items}
          />

          <LivePlatformSection
            visual={PLATFORM_VISUALS.hacker_news}
            count={data.hackerNews.count}
            items={data.hackerNews.items}
            viewAllHref="/platform/hacker_news"
          />

          <LivePlatformSection
            visual={PLATFORM_VISUALS.product_hunt}
            count={data.productHunt.count}
            items={data.productHunt.items}
            viewAllHref="/platform/product_hunt"
          />

          <LivePlatformSection
            visual={PLATFORM_VISUALS.youtube}
            count={data.youtube.count}
            items={data.youtube.items}
            viewAllHref="/platform/youtube"
          />

          <ComingSoonSection
            visual={PLATFORM_VISUALS.reddit}
            descriptionKey="platform.reddit.description"
          />

          <ComingSoonSection visual={PLATFORM_VISUALS.x} descriptionKey="platform.x.description" />
        </div>
      </section>
    </main>
  );
}
