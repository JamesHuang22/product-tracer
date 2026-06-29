import { ImageResponse } from 'next/og';
import { getProjectOgData } from '@/lib/db';
import { formatCategory } from '@/lib/categories';

// Queries Postgres (postgres.js isn't edge-compatible), so this runs on the
// Node runtime rather than the edge. The response is cached an hour at the CDN
// per the Cache-Control header below, so the per-render DB hit is rare.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const WIDTH = 1200;
const HEIGHT = 630;

const PLATFORM_LABEL: Record<string, string> = {
  github: 'GitHub',
  hacker_news: 'Hacker News',
  product_hunt: 'Product Hunt',
  youtube: 'YouTube',
  reddit: 'Reddit',
  x: 'X',
};

function fmt(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toLocaleString();
}

/**
 * GET /og/projects/[slug] — 1200×630 Open Graph card for a product detail page.
 * Renders the product name, category, GitHub stars, and net votes on the dark
 * OpenProduct brand card. Referenced by the page's generateMetadata. Falls back
 * to a generic branded card when the slug is unknown.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProjectOgData(slug).catch(() => null);

  const name = project?.name ?? 'OpenProduct';
  const oneLiner = project?.one_liner ?? 'Cross-platform indie product signals.';
  const category = project?.llm_category ? formatCategory(project.llm_category) : null;
  const stars = project?.github_stars ?? null;
  const net = project ? project.upvotes - project.downvotes : 0;
  const platforms = (project?.platforms ?? []).filter((p) => PLATFORM_LABEL[p]).slice(0, 4);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#0a0a0a',
          backgroundImage:
            'radial-gradient(1200px 600px at 85% -10%, rgba(16,185,129,0.18), transparent 60%)',
          padding: '72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: 18, height: 18, borderRadius: 9999, backgroundColor: '#10b981' }} />
          <div style={{ color: '#fafafa', fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>
            OpenProduct
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {category && (
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                color: '#6ee7b7',
                fontSize: 26,
                padding: '8px 20px',
                borderRadius: 9999,
                border: '1px solid rgba(16,185,129,0.4)',
                backgroundColor: 'rgba(16,185,129,0.08)',
              }}
            >
              {category}
            </div>
          )}
          <div
            style={{
              color: '#fafafa',
              fontSize: name.length > 28 ? 64 : 84,
              fontWeight: 700,
              letterSpacing: -2,
              lineHeight: 1.05,
            }}
          >
            {name.length > 48 ? name.slice(0, 47) + '…' : name}
          </div>
          {oneLiner && (
            <div style={{ color: '#a3a3a3', fontSize: 32, lineHeight: 1.3, maxWidth: 980 }}>
              {oneLiner.length > 120 ? oneLiner.slice(0, 119) + '…' : oneLiner}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
          {stars != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: '#fbbf24', fontSize: 36 }}>★</div>
              <div style={{ color: '#fafafa', fontSize: 36, fontWeight: 600 }}>{fmt(stars)}</div>
            </div>
          )}
          {net !== 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ color: net > 0 ? '#34d399' : '#f87171', fontSize: 36 }}>
                {net > 0 ? '▲' : '▼'}
              </div>
              <div style={{ color: '#fafafa', fontSize: 36, fontWeight: 600 }}>
                {net > 0 ? `+${fmt(net)}` : fmt(net)}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '12px' }}>
            {platforms.map((p) => (
              <div
                key={p}
                style={{
                  display: 'flex',
                  color: '#d4d4d4',
                  fontSize: 24,
                  padding: '8px 18px',
                  borderRadius: 9999,
                  border: '1px solid #404040',
                }}
              >
                {PLATFORM_LABEL[p]}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    },
  );
}
