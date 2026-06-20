import type { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { cookies } from 'next/headers';
import { ArrowUpRight } from 'lucide-react';
import { getLatestWeeklyTrend, type WeeklyTrendProduct } from '@/lib/db';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, translate, type Locale } from '@/lib/i18n';

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

function ProductCard({ product }: { product: WeeklyTrendProduct }) {
  return (
    <Link
      href={`/projects/${product.slug}` as Route}
      className="flex flex-col gap-1.5 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-50">
          <PlatformBadge platform={product.platform} />
          {product.name}
          <ArrowUpRight className="h-3.5 w-3.5 text-neutral-400" />
        </span>
        {Number.isFinite(product.score) && (
          <span className="shrink-0 rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            {product.score}
          </span>
        )}
      </div>
      {product.description && (
        <p className="text-sm leading-relaxed text-neutral-500">{product.description}</p>
      )}
    </Link>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
      {children}
    </h2>
  );
}

export default async function TrendsPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(raw) ? (raw as Locale) : DEFAULT_LOCALE;

  const trend = await getLatestWeeklyTrend();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{translate(locale, 'trends.title')}</h1>
        <p className="mt-2 text-sm text-neutral-500">{translate(locale, 'trends.subtitle')}</p>
        {trend && (
          <p className="mt-1 text-xs tabular-nums text-neutral-400">
            {translate(locale, 'trends.weekOf', { start: trend.week_start, end: trend.week_end })}
          </p>
        )}
      </header>

      {!trend ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500 dark:border-neutral-700">
          {translate(locale, 'trends.noTrendsYet')}
        </div>
      ) : (
        <div className="space-y-12">
          {(() => {
            const summary = locale === 'zh' ? trend.summary_zh || trend.summary_en : trend.summary_en || trend.summary_zh;
            return summary ? (
              <section>
                <SectionHeading>{translate(locale, 'trends.summary')}</SectionHeading>
                <p className="text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {summary}
                </p>
              </section>
            ) : null;
          })()}

          {trend.top_products.length > 0 && (
            <section>
              <SectionHeading>{translate(locale, 'trends.topProducts')}</SectionHeading>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {trend.top_products.map((p, i) => (
                  <ProductCard key={`${p.slug}-${i}`} product={p} />
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

          <p className="border-t border-neutral-100 pt-6 text-xs tabular-nums text-neutral-400 dark:border-neutral-800/80">
            {translate(locale, 'trends.stats', {
              projects: trend.total_projects_scanned,
              signals: trend.total_signals_generated,
              insights: trend.total_insights_collected,
            })}
          </p>
        </div>
      )}
    </main>
  );
}
