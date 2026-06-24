import type { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { cookies } from 'next/headers';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import {
  getLatestWeeklyTrend,
  getTrendWeeks,
  getTrendCategoryDistribution,
  getTrendTopProducts,
  type TrendDistributionBar,
  type WeeklyTrend,
  type WeeklyTrendProduct,
} from '@/lib/db';
import { TrendWeekSelect } from './trend-week-select';
import { formatCategory } from '@/lib/categories';
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  translate,
  type Locale,
  type MessageKey,
} from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Weekly Hot Trends — Product Tracer',
  description: 'A weekly read on what is gaining traction in the indie dev & AI space.',
};

// Live data — reflect the latest weekly analysis on every request.
export const dynamic = 'force-dynamic';

// Short, colour-coded platform chips (mirrors the projects table).
const PLATFORM_BADGE: Record<string, { label: string; cls: string }> = {
  github: { label: 'GH', cls: 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' },
  hacker_news: { label: 'HN', cls: 'bg-orange-500 text-white' },
  product_hunt: { label: 'PH', cls: 'bg-red-500 text-white' },
  youtube: { label: 'YT', cls: 'bg-red-600 text-white' },
  reddit: { label: 'R', cls: 'bg-orange-600 text-white' },
  x: { label: 'X', cls: 'bg-black text-white dark:bg-white dark:text-black' },
};

/** Canonical platform keys; anything else (e.g. a URL host) is bucketed as 'other'. */
const PLATFORM_KEYS = new Set([
  'github',
  'hacker_news',
  'product_hunt',
  'youtube',
  'reddit',
  'x',
  'other',
]);

function PlatformBadge({ platform }: { platform: string }) {
  const b =
    PLATFORM_BADGE[platform] ?? { label: platform.slice(0, 2).toUpperCase(), cls: 'bg-neutral-400 text-white' };
  return (
    <span
      className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded px-1 text-[10px] font-bold ${b.cls}`}
      title={platform}
    >
      {b.label}
    </span>
  );
}

/** Display label for a distribution bucket — a platform name, a category, or "Other". */
function displayLabel(locale: Locale, label: string): string {
  if (PLATFORM_KEYS.has(label)) return translate(locale, `platform.name.${label}` as MessageKey);
  return formatCategory(label);
}

/** The most-frequent source among a week's top products (URL hosts → 'other'). */
function dominantSource(products: WeeklyTrendProduct[]): { key: string; count: number } | null {
  const counts = new Map<string, number>();
  for (const p of products) {
    const key = PLATFORM_KEYS.has(p.platform) ? p.platform : 'other';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  let best: { key: string; count: number } | null = null;
  for (const [key, count] of counts) {
    if (!best || count > best.count) best = { key, count };
  }
  return best;
}

/** The single highest-scoring product of a week. */
function topByScore(products: WeeklyTrendProduct[]): WeeklyTrendProduct | null {
  let best: WeeklyTrendProduct | null = null;
  for (const p of products) {
    if (!best || (p.score ?? 0) > (best.score ?? 0)) best = p;
  }
  return best;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
      {children}
    </h2>
  );
}

/** A single horizontal bar in the CSS-only distribution chart. */
function DistributionBar({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 truncate text-sm text-neutral-600 dark:text-neutral-400" title={label}>
        {label}
      </span>
      <div className="h-5 flex-1 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
        <div
          className="h-full rounded bg-emerald-500/80"
          style={{ width: `${Math.max(pct, 3)}%` }}
        />
      </div>
      <span className="w-14 shrink-0 text-right text-xs tabular-nums text-neutral-500">
        {count} · {pct}%
      </span>
    </div>
  );
}

/** A numbered entry in the "Top products" list. */
function TopProductRow({ rank, product }: { rank: number; product: WeeklyTrendProduct }) {
  return (
    <Link
      href={`/projects/${product.slug}` as Route}
      className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600"
    >
      <span className="w-5 shrink-0 text-center text-sm font-semibold tabular-nums text-neutral-400">
        {rank}
      </span>
      <PlatformBadge platform={product.platform} />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
        {product.name}
      </span>
      {Number.isFinite(product.score) && (
        <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          {product.score}
        </span>
      )}
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
    </Link>
  );
}

/** One side of the week-over-week comparison card. */
function WeekColumn({
  title,
  trend,
  locale,
}: {
  title: string;
  trend: WeeklyTrend;
  locale: Locale;
}) {
  const source = dominantSource(trend.top_products);
  const top = topByScore(trend.top_products);
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs tabular-nums text-neutral-400">
          {trend.week_start} – {trend.week_end}
        </span>
      </div>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-neutral-500">{translate(locale, 'trends.topSource')}</dt>
          <dd className="inline-flex items-center gap-1.5 font-medium">
            {source ? (
              <>
                <PlatformBadge platform={source.key} />
                {displayLabel(locale, source.key)}
              </>
            ) : (
              '—'
            )}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="shrink-0 text-neutral-500">{translate(locale, 'trends.topProduct')}</dt>
          <dd className="min-w-0 truncate font-medium" title={top?.name}>
            {top ? top.name : '—'}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(raw) ? (raw as Locale) : DEFAULT_LOCALE;

  // Available weeks (newest first) drive the selector. The `?week=` param picks
  // one — validated against the real list so a stale/garbage value falls back to
  // the latest week. The previous week (for the WoW card) is the next entry.
  const weeks = await getTrendWeeks();
  const latestWeek = weeks[0]?.week_start;
  const { week: weekParam } = await searchParams;
  const selectedWeek = weeks.find((w) => w.week_start === weekParam)?.week_start ?? latestWeek;
  const selectedIdx = weeks.findIndex((w) => w.week_start === selectedWeek);
  const prevWeek = selectedIdx >= 0 ? weeks[selectedIdx + 1]?.week_start : undefined;

  const [trend, prev, distribution, topProducts] = await Promise.all([
    getLatestWeeklyTrend(selectedWeek),
    prevWeek ? getLatestWeeklyTrend(prevWeek) : Promise.resolve(null),
    getTrendCategoryDistribution(selectedWeek),
    getTrendTopProducts(5, selectedWeek),
  ]);
  const distTotal = distribution.reduce((s, b: TrendDistributionBar) => s + b.count, 0);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{translate(locale, 'trends.title')}</h1>
        <p className="mt-2 text-sm text-neutral-500">{translate(locale, 'trends.subtitle')}</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {trend && (
            <p className="text-xs tabular-nums text-neutral-400">
              {translate(locale, 'trends.weekOf', { start: trend.week_start, end: trend.week_end })}
            </p>
          )}
          {latestWeek && selectedWeek && (
            <TrendWeekSelect weeks={weeks} selected={selectedWeek} latest={latestWeek} />
          )}
        </div>
      </header>

      {!trend ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
          {translate(locale, 'trends.noTrendsYet')}
        </div>
      ) : (
        <div className="space-y-12">
          {(() => {
            const summary =
              locale === 'zh'
                ? trend.summary_zh || trend.summary_en
                : trend.summary_en || trend.summary_zh;
            return summary ? (
              <section>
                <SectionHeading>{translate(locale, 'trends.summary')}</SectionHeading>
                <p className="text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {summary}
                </p>
              </section>
            ) : null;
          })()}

          {/* Week-over-week comparison */}
          <section>
            <SectionHeading>{translate(locale, 'trends.wow')}</SectionHeading>
            {prev ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <WeekColumn title={translate(locale, 'trends.thisWeek')} trend={trend} locale={locale} />
                <WeekColumn title={translate(locale, 'trends.lastWeek')} trend={prev} locale={locale} />
              </div>
            ) : (
              <p className="text-sm text-neutral-500">{translate(locale, 'trends.noPrevWeek')}</p>
            )}
          </section>

          {/* CSS-only distribution chart */}
          {distribution.length > 0 && (
            <section>
              <SectionHeading>{translate(locale, 'trends.distribution')}</SectionHeading>
              <p className="-mt-2 mb-4 text-xs text-neutral-400">
                {translate(locale, 'trends.distributionSubtitle')}
              </p>
              <div className="space-y-2">
                {distribution.map((b) => (
                  <DistributionBar
                    key={b.label}
                    label={displayLabel(locale, b.label)}
                    count={b.count}
                    total={distTotal}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Top products (numbered, by score) */}
          {topProducts.length > 0 && (
            <section>
              <SectionHeading>{translate(locale, 'trends.topProducts')}</SectionHeading>
              <div className="space-y-2">
                {topProducts.map((p, i) => (
                  <TopProductRow key={`${p.slug}-${i}`} rank={i + 1} product={p} />
                ))}
              </div>
            </section>
          )}

          {trend.emerging_themes.length > 0 && (
            <section>
              <SectionHeading>{translate(locale, 'trends.emergingThemes')}</SectionHeading>
              <div className="flex flex-wrap gap-2">
                {trend.emerging_themes.map((theme) => (
                  <span
                    key={theme}
                    className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </section>
          )}

          {trend.video_highlights && (
            <section>
              <SectionHeading>{translate(locale, 'trends.videoHighlights')}</SectionHeading>
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                {trend.video_highlights}
              </p>
            </section>
          )}

          <p className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-6 text-xs tabular-nums text-neutral-400 dark:border-neutral-800/80">
            <span>
              {translate(locale, 'trends.stats', {
                projects: trend.total_projects_scanned,
                signals: trend.total_signals_generated,
                insights: trend.total_insights_collected,
              })}
            </span>
            <Link
              href="/projects"
              className="inline-flex items-center gap-1 font-medium normal-case text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              {translate(locale, 'home.section.projects.viewAll')}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </p>
        </div>
      )}
    </main>
  );
}
