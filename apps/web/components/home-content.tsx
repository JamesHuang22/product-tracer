'use client';

import Link from 'next/link';
import type { Route } from 'next';
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Flame,
  Radio,
  Sparkles,
  TrendingUp,
  Youtube,
} from 'lucide-react';
import type { PlatformTopItem, ProjectListItem, VideoInsight, WeeklyTrendProduct } from '@/lib/db';
import { cleanOneLiner, fmtCount, localizedPair, localizedText } from '@/lib/format';
import { useI18n } from '@/lib/i18n-context';
import type { MessageKey } from '@/lib/i18n';
import { LivePlatformSection, Monogram, PLATFORM_VISUALS } from '@/components/platform-section';
import { CategoryBadge } from '@/components/category-badge';

/** The four integrated sources, in display order — drives the hero chips. */
const LIVE_PLATFORMS = [
  PLATFORM_VISUALS.github,
  PLATFORM_VISUALS.hacker_news,
  PLATFORM_VISUALS.product_hunt,
  PLATFORM_VISUALS.youtube,
];

/** Single-locale weekly-trend overview for the home Trends section. The summary
 * is already resolved to the active language server-side; the full report (both
 * languages, video highlights, corpus stats) lives on /trends. */
export interface TrendOverview {
  weekStart: string;
  weekEnd: string;
  summary: string;
  topProducts: WeeklyTrendProduct[];
  emergingThemes: string[];
}

export interface HomeData {
  totalLive: number;
  livePlatforms: number;
  totalProjects: number;
  newThisWeek: number;
  hotSignals: number;
  latest: ProjectListItem[];
  videoInsights: VideoInsight[];
  github: { count: number; items: PlatformTopItem[] };
  hackerNews: { count: number; items: PlatformTopItem[] };
  productHunt: { count: number; items: PlatformTopItem[] };
  youtube: { count: number; items: PlatformTopItem[] };
  trend: TrendOverview | null;
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

/** Shared header for the three home overview sections: icon + title + subtitle
 * on the left, an optional "view all →" link on the right. */
function SectionHeader({
  icon,
  title,
  subtitle,
  viewAllHref,
  viewAllLabel,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  viewAllHref?: Route;
  viewAllLabel?: string;
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        <h2 className="inline-flex items-center gap-2 text-xl font-semibold tracking-tight">
          {icon}
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>}
      </div>
      {viewAllHref && viewAllLabel && (
        <Link
          href={viewAllHref}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          {viewAllLabel}
          <ArrowRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

/** Compact product card for the Trends overview — name + platform badge + score,
 * linking through to the project detail page (mirrors the /trends ProductCard). */
function TrendProductCard({ product }: { product: WeeklyTrendProduct }) {
  return (
    <Link
      href={`/projects/${product.slug}` as Route}
      className="flex flex-col gap-1.5 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-2 font-medium text-neutral-900 dark:text-neutral-50">
          <PlatformBadges platforms={[product.platform]} />
          <span className="truncate">{product.name}</span>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
        </span>
        {Number.isFinite(product.score) && (
          <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            {product.score}
          </span>
        )}
      </div>
      {product.description && (
        <p className="line-clamp-2 text-sm leading-relaxed text-neutral-500">{product.description}</p>
      )}
    </Link>
  );
}

function LatestCard({ project }: { project: ProjectListItem }) {
  const { t, locale } = useI18n();
  const oneLiner = localizedText(locale, cleanOneLiner(project.one_liner));
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
      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <span className="text-[11px] tabular-nums text-neutral-400">
          {relativeLabel(project.created_at, t)}
        </span>
        {project.llm_category && (
          <CategoryBadge
            category={project.llm_category}
            className="px-1.5 py-0 text-[10px]"
          />
        )}
      </div>
    </Link>
  );
}

/** Sentiment → coloured dot (mirrors the /youtube-insights digest). */
const SENTIMENT_DOT: Record<string, string> = {
  positive: '🟢',
  neutral: '🟡',
  negative: '🔴',
};

/** Compact, text-only bilingual insight card: English takeaway over its Chinese
 * translation, no thumbnail/title/channel. The whole card links to the video. */
function InsightCard({ insight }: { insight: VideoInsight }) {
  const { t, locale } = useI18n();
  const dot = SENTIMENT_DOT[insight.sentiment?.toLowerCase() ?? ''];
  const hot = (insight.relevance_score ?? 0) >= 7;
  // Locale-aware single paragraph. English mode never falls back to the Chinese
  // column (and drops the English one if it actually holds Chinese), keeping the
  // EN UI free of stray Chinese.
  const text = localizedPair(locale, insight.key_insight, insight.key_insight_zh);

  return (
    <a
      href={insight.video_url}
      target="_blank"
      rel="noreferrer"
      className="flex w-72 shrink-0 flex-col rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600"
    >
      {text && (
        <p className="line-clamp-5 text-sm leading-relaxed text-neutral-900 dark:text-neutral-100">
          {hot && <span className="mr-1" aria-hidden>🔥</span>}
          {text}
        </p>
      )}
      <div className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-neutral-400">
        {dot && <span aria-hidden>{dot}</span>}
        <span className="inline-flex items-center gap-1">
          <span aria-hidden>▶</span>
          {t('insights.watchOn')}
        </span>
      </div>
    </a>
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

      {/* ─── Section 1: Projects ─── */}
      <section className="mt-16">
        <SectionHeader
          icon={<Boxes className="h-4 w-4 text-emerald-500" />}
          title={t('home.section.projects.title')}
          subtitle={t('home.section.projects.subtitle')}
          viewAllHref="/projects"
          viewAllLabel={t('home.section.projects.viewAll')}
        />

        {/* Latest activity — newest projects, any platform */}
        <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
          <Activity className="h-3.5 w-3.5" />
          {t('home.latest.title')}
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

        {/* Top projects by platform */}
        <div className="mb-2 mt-8 flex items-center justify-between gap-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400">
          <span>{t('byPlatform.title')}</span>
          <span className="tabular-nums normal-case">
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

      {/* ─── Section 2: Insights ─── */}
      <section className="mt-16">
        <SectionHeader
          icon={<Youtube className="h-4 w-4 text-red-600" />}
          title={t('home.section.insights.title')}
          subtitle={t('home.section.insights.subtitle')}
          viewAllHref="/youtube-insights"
          viewAllLabel={t('home.section.insights.viewAll')}
        />

        {data.videoInsights.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
            {t('home.insights.empty')}
          </div>
        ) : (
          <div className="-mx-6 flex gap-3 overflow-x-auto px-6 pb-2 sm:mx-0 sm:px-0">
            {data.videoInsights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </section>

      {/* ─── Section 3: Trends ─── */}
      <section className="mt-16">
        <SectionHeader
          icon={<TrendingUp className="h-4 w-4 text-amber-500" />}
          title={t('home.section.trends.title')}
          subtitle={
            data.trend
              ? t('home.trends.weekOf', {
                  start: data.trend.weekStart,
                  end: data.trend.weekEnd,
                })
              : t('home.section.trends.subtitle')
          }
          viewAllHref="/trends"
          viewAllLabel={t('home.section.trends.viewAll')}
        />

        {!data.trend ? (
          <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
            {t('home.trends.empty')}
          </div>
        ) : (
          <div className="space-y-6">
            {data.trend.summary && (
              <p className="max-w-3xl text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                {data.trend.summary}
              </p>
            )}

            {data.trend.topProducts.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {data.trend.topProducts.map((p, i) => (
                  <TrendProductCard key={`${p.slug}-${i}`} product={p} />
                ))}
              </div>
            )}

            {data.trend.emergingThemes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.trend.emergingThemes.map((theme) => (
                  <span
                    key={theme}
                    className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
