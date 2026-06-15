'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { Activity, ArrowRight, Boxes, Flame, Radio, Sparkles } from 'lucide-react';
import type { PlatformTopItem, ProjectListItem } from '@/lib/db';
import { cleanOneLiner, fmtCount } from '@/lib/format';
import { useI18n } from '@/lib/i18n-context';
import type { MessageKey } from '@/lib/i18n';
import { LivePlatformSection, Monogram, PLATFORM_VISUALS } from '@/components/platform-section';

/** The four integrated sources, in display order — drives the hero chips. */
const LIVE_PLATFORMS = [
  PLATFORM_VISUALS.github,
  PLATFORM_VISUALS.hacker_news,
  PLATFORM_VISUALS.product_hunt,
  PLATFORM_VISUALS.youtube,
];

export interface HomeData {
  totalLive: number;
  livePlatforms: number;
  totalProjects: number;
  newThisWeek: number;
  hotSignals: number;
  latest: ProjectListItem[];
  github: { count: number; items: PlatformTopItem[] };
  hackerNews: { count: number; items: PlatformTopItem[] };
  productHunt: { count: number; items: PlatformTopItem[] };
  youtube: { count: number; items: PlatformTopItem[] };
}

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

/** Coarse relative time ("2d ago"), localised. Day granularity is stable across
 * the SSR→hydration boundary, so no mismatch despite `now` differing by ms. */
function relativeLabel(value: string, t: Translate): string {
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return '';
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60_000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day >= 1) return t('time.daysAgo', { n: day });
  if (hr >= 1) return t('time.hoursAgo', { n: hr });
  if (min >= 1) return t('time.minutesAgo', { n: min });
  return t('time.justNow');
}

// Short, colour-coded platform chips (mirrors the projects table).
const PLATFORM_BADGE: Record<string, { label: string; cls: string }> = {
  github: { label: 'GH', cls: 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' },
  hacker_news: { label: 'HN', cls: 'bg-orange-500 text-white' },
  product_hunt: { label: 'PH', cls: 'bg-red-500 text-white' },
  youtube: { label: 'YT', cls: 'bg-red-600 text-white' },
  reddit: { label: 'R', cls: 'bg-orange-600 text-white' },
  x: { label: 'X', cls: 'bg-black text-white dark:bg-white dark:text-black' },
};

function PlatformBadges({ platforms }: { platforms: string[] }) {
  if (!platforms || platforms.length === 0) return null;
  return (
    <span className="inline-flex gap-1">
      {platforms.map((p) => {
        const b = PLATFORM_BADGE[p] ?? { label: p.slice(0, 2).toUpperCase(), cls: 'bg-neutral-400 text-white' };
        return (
          <span
            key={p}
            className={`inline-flex h-4 min-w-[1rem] items-center justify-center rounded px-1 text-[9px] font-bold ${b.cls}`}
            title={p}
          >
            {b.label}
          </span>
        );
      })}
    </span>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center gap-1.5 text-neutral-400">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
    </div>
  );
}

function LatestCard({ project }: { project: ProjectListItem }) {
  const { t } = useI18n();
  const oneLiner = cleanOneLiner(project.one_liner);
  return (
    <Link
      href={`/projects/${project.slug}` as Route}
      className="flex w-60 shrink-0 flex-col rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
          {project.name}
        </span>
        <PlatformBadges platforms={project.platforms ?? []} />
      </div>
      {oneLiner && (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-neutral-500">{oneLiner}</p>
      )}
      <span className="mt-auto pt-3 text-[11px] tabular-nums text-neutral-400">
        {relativeLabel(project.created_at, t)}
      </span>
    </Link>
  );
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
          <span className="text-sm text-neutral-500">{t('hero.dailyEmail')}</span>
        </div>

        {/* Coverage at a glance — the four integrated sources. */}
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
            {t('home.sources.label')}
          </span>
          {LIVE_PLATFORMS.map((v) => (
            <span
              key={v.name}
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white py-1 pl-1 pr-3 text-xs font-medium text-neutral-700 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-300"
            >
              <Monogram visual={v} size="sm" />
              {v.name}
            </span>
          ))}
        </div>
      </section>

      {/* Stats overview */}
      <section className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<Boxes className="h-3.5 w-3.5" />}
          value={fmtCount(data.totalProjects)}
          label={t('home.stats.totalProjects')}
        />
        <StatCard
          icon={<Radio className="h-3.5 w-3.5" />}
          value={data.livePlatforms.toLocaleString()}
          label={t('home.stats.activePlatforms')}
        />
        <StatCard
          icon={<Sparkles className="h-3.5 w-3.5" />}
          value={fmtCount(data.newThisWeek)}
          label={t('home.stats.newThisWeek')}
        />
        <StatCard
          icon={<Flame className="h-3.5 w-3.5" />}
          value={fmtCount(data.hotSignals)}
          label={t('home.stats.hotSignals')}
        />
      </section>

      {/* Latest activity */}
      <section className="mt-12">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="inline-flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Activity className="h-4 w-4 text-emerald-500" />
            {t('home.latest.title')}
          </h2>
          {data.latest.length > 0 && (
            <span className="text-xs tabular-nums text-neutral-500">
              {t('home.latest.subtitle', { count: data.latest.length })}
            </span>
          )}
        </div>

        {data.latest.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
            {t('home.latest.empty')}
          </div>
        ) : (
          <div className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-2 sm:mx-0 sm:px-0">
            {data.latest.map((p) => (
              <LatestCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </section>

      {/* Platform sections */}
      <section className="mt-16">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-xl font-semibold tracking-tight">{t('byPlatform.title')}</h2>
          <span className="text-xs tabular-nums text-neutral-500">
            {t('byPlatform.summary', { live: data.livePlatforms })}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LivePlatformSection
            visual={PLATFORM_VISUALS.github}
            count={data.github.count}
            items={data.github.items}
            viewAllHref="/platform/github"
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
        </div>
      </section>
    </main>
  );
}
