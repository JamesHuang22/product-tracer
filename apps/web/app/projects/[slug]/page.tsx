import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { ArrowUpRight, ChevronRight, Sparkles } from 'lucide-react';
import {
  getProjectBySlug,
  type ProjectDetail,
  type ProjectMetricPoint,
  type ProjectPlatformSnapshot,
} from '@/lib/db';
import { fmtCount, cleanOneLiner, localizedText } from '@/lib/format';
import { translate, DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from '@/lib/i18n';
import { CategoryBadge } from '@/components/category-badge';
import { RelatedProjects } from '@/components/related-projects';
import { BookmarkButton } from '@/components/bookmark-button';

// Live data — reflect the latest collector run on every request.
export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Per-platform display metadata
// ---------------------------------------------------------------------------

interface PlatformMeta {
  name: string;
  monogram: string;
  monogramBg: string;
  monogramFg: string;
  /** Which daily metric column drives this platform's trend sparkline. */
  metricKey:
    | keyof Pick<ProjectMetricPoint, 'github_stars' | 'ph_upvotes' | 'hn_score' | 'reddit_score'>
    | null;
}

const PLATFORM_META: Record<string, PlatformMeta> = {
  github: {
    name: 'GitHub',
    monogram: 'GH',
    monogramBg: 'bg-neutral-900 dark:bg-neutral-100',
    monogramFg: 'text-white dark:text-neutral-900',
    metricKey: 'github_stars',
  },
  hacker_news: {
    name: 'Hacker News',
    monogram: 'Y',
    monogramBg: 'bg-orange-500',
    monogramFg: 'text-white',
    metricKey: 'hn_score',
  },
  product_hunt: {
    name: 'Product Hunt',
    monogram: 'PH',
    monogramBg: 'bg-red-500',
    monogramFg: 'text-white',
    metricKey: 'ph_upvotes',
  },
  youtube: {
    name: 'YouTube',
    monogram: 'YT',
    monogramBg: 'bg-red-600',
    monogramFg: 'text-white',
    // No daily youtube metric column — engagement lives in the snapshot stat.
    metricKey: null,
  },
  reddit: {
    name: 'Reddit',
    monogram: 'R',
    monogramBg: 'bg-orange-600',
    monogramFg: 'text-white',
    metricKey: 'reddit_score',
  },
  x: {
    name: 'X',
    monogram: 'X',
    monogramBg: 'bg-black dark:bg-white',
    monogramFg: 'text-white dark:text-black',
    metricKey: null,
  },
};

function metaFor(platform: string): PlatformMeta {
  return (
    PLATFORM_META[platform] ?? {
      name: platform,
      monogram: platform.slice(0, 2).toUpperCase(),
      monogramBg: 'bg-neutral-400',
      monogramFg: 'text-white',
      metricKey: null,
    }
  );
}

// ---------------------------------------------------------------------------
// Tiny dependency-free SVG sparkline
// ---------------------------------------------------------------------------

function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const pts = values.filter((v) => Number.isFinite(v));
  if (pts.length < 2) return null;

  const w = 240;
  const h = 48;
  const pad = 3;
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const span = max - min || 1;
  const stepX = (w - pad * 2) / (pts.length - 1);

  const coords = pts.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (h - pad * 2) * (1 - (v - min) / span);
    return [x, y] as const;
  });
  const line = coords
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${coords[coords.length - 1]![0].toFixed(1)},${h - pad} L${coords[0]![0].toFixed(1)},${h - pad} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className={`h-12 w-full ${className ?? ''}`}
      aria-hidden
    >
      <path d={area} className="fill-emerald-500/10" />
      <path d={line} fill="none" className="stroke-emerald-500" strokeWidth={1.5} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Per-platform stat cards
// ---------------------------------------------------------------------------

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="text-lg font-semibold tabular-nums">{fmtCount(value)}</div>
      <div className="text-xs text-neutral-500">{label}</div>
    </div>
  );
}

/** Platform-specific external link, when we can construct a reliable one. */
function platformLink(snap: ProjectPlatformSnapshot, primaryUrl: string | null): string | null {
  switch (snap.platform) {
    case 'hacker_news':
      return `https://news.ycombinator.com/item?id=${snap.external_id}`;
    case 'github':
      return primaryUrl;
    case 'youtube': {
      // external_id is "videoId:owner/repo" — recover the video id for the link.
      const videoId = snap.external_id.split(':')[0];
      return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
    }
    default:
      return null;
  }
}

function PlatformCard({
  snap,
  metrics,
  primaryUrl,
  locale,
}: {
  snap: ProjectPlatformSnapshot;
  metrics: ProjectMetricPoint[];
  primaryUrl: string | null;
  locale: 'en' | 'zh';
}) {
  const meta = metaFor(snap.platform);
  const series =
    meta.metricKey === null
      ? []
      : metrics.map((m) => m[meta.metricKey!]).filter((v): v is number => typeof v === 'number');

  const link = platformLink(snap, primaryUrl);

  return (
    <section className="flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold tracking-tight ${meta.monogramBg} ${meta.monogramFg}`}
          >
            {meta.monogram}
          </span>
          <div className="font-semibold tracking-tight">{meta.name}</div>
        </div>
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-0.5 text-xs font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            View
            <ArrowUpRight className="h-3 w-3" />
          </a>
        )}
      </header>

      <div className="flex flex-wrap gap-x-8 gap-y-3">
        {snap.platform === 'github' && (
          <>
            <Stat label={translate(locale, 'detail.stars')} value={snap.stars} />
            <Stat label={translate(locale, 'detail.forks')} value={snap.forks} />
          </>
        )}
        {snap.platform === 'hacker_news' && (
          <>
            <Stat label={translate(locale, 'detail.points')} value={snap.upvotes} />
            <Stat label={translate(locale, 'detail.comments')} value={snap.comments} />
          </>
        )}
        {snap.platform === 'product_hunt' && (
          <Stat label={translate(locale, 'detail.upvotes')} value={snap.upvotes} />
        )}
        {snap.platform === 'reddit' && (
          <>
            <Stat label={translate(locale, 'detail.upvotes')} value={snap.upvotes} />
            <Stat label={translate(locale, 'detail.comments')} value={snap.comments} />
          </>
        )}
        {snap.platform === 'youtube' && (
          <>
            <Stat label={translate(locale, 'detail.views')} value={snap.upvotes} />
            <Stat label={translate(locale, 'detail.likes')} value={snap.comments} />
          </>
        )}
        {snap.platform === 'x' && (
          <Stat label={translate(locale, 'detail.mentions')} value={snap.upvotes} />
        )}
      </div>

      <div className="mt-auto pt-4">
        {series.length >= 2 ? (
          <Sparkline values={series} />
        ) : (
          <div className="text-xs text-neutral-400">
            {translate(locale, 'detail.notEnoughHistory')}
          </div>
        )}
        {snap.updated_at && (
          <div className="mt-1 text-[11px] text-neutral-400">
            {translate(locale, 'detail.updated', { date: snap.updated_at })}
          </div>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return { title: 'Project not found — Product Tracer' };
  return {
    title: `${project.name} — Product Tracer`,
    description: cleanOneLiner(project.one_liner) ?? undefined,
  };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project: ProjectDetail | null = await getProjectBySlug(slug);
  if (!project) notFound();

  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(raw) ? (raw as 'en' | 'zh') : DEFAULT_LOCALE;

  // AI summary, suppressed in EN mode if it happens to be Chinese (same rule as
  // one-liners). Null until migration 0013 + the generate-summaries run populate it.
  const aiSummary = localizedText(locale, project.ai_summary);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-neutral-500">
          <li>
            <Link
              href="/projects"
              className="transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              {translate(locale, 'nav.projects')}
            </Link>
          </li>
          <li className="flex min-w-0 items-center gap-2">
            <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
            <span className="truncate text-neutral-900 dark:text-neutral-100">{project.name}</span>
          </li>
        </ol>
      </nav>

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
          <CategoryBadge category={project.llm_category} />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
          {project.primary_url && (
            <a
              href={project.primary_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {translate(locale, 'detail.visitSite')}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
          <BookmarkButton slug={project.slug} variant="labeled" />
          <span className="text-neutral-400">
            {translate(locale, 'projects.trackedSince', { date: project.created_at })}
          </span>
        </div>
      </header>

      {aiSummary && (
        <section className="mt-8">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-neutral-800 dark:bg-neutral-900/40">
            <div className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              {translate(locale, 'detail.aiSummary')}
            </div>
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              {aiSummary}
            </p>
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-neutral-500">
          {translate(locale, 'detail.crossPlatformSignals')}
        </h2>
        {project.platforms.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
            {translate(locale, 'detail.noMetrics')}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {project.platforms.map((snap) => (
              <PlatformCard
                key={snap.platform}
                snap={snap}
                metrics={project.metrics}
                primaryUrl={project.primary_url}
                locale={locale}
              />
            ))}
          </div>
        )}
      </section>

      <RelatedProjects currentSlug={project.slug} category={project.llm_category} locale={locale} />
    </main>
  );
}
