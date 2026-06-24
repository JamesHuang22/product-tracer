import { ImageResponse } from 'next/og';

// Static branded card — no DB/network, so it renders fast on the edge and never
// depends on request state. Cached at the edge per the Cache-Control below.
export const runtime = 'edge';

const WIDTH = 1200;
const HEIGHT = 630;

/**
 * GET /og/youtube-insights — 1200×630 Open Graph card for the YouTube Insights
 * page, referenced by the page's generateMetadata. Dark, brand-consistent
 * (emerald accent + Product Tracer wordmark) so shared links preview cleanly.
 */
export function GET() {
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
            Product Tracer
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 84,
                height: 84,
                borderRadius: 20,
                backgroundColor: '#dc2626',
                color: 'white',
                fontSize: 44,
              }}
            >
              ▶
            </div>
            <div style={{ color: '#fafafa', fontSize: 76, fontWeight: 700, letterSpacing: -2 }}>
              YouTube Insights
            </div>
          </div>
          <div style={{ color: '#a3a3a3', fontSize: 34, lineHeight: 1.3, maxWidth: 900 }}>
            A bilingual digest of LLM-analysed YouTube videos — key takeaways by category.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {['AI/ML', 'Dev Tools', 'Startups', 'Tech News', 'Hardware'].map((tag) => (
            <div
              key={tag}
              style={{
                display: 'flex',
                color: '#d4d4d4',
                fontSize: 24,
                padding: '8px 18px',
                borderRadius: 9999,
                border: '1px solid #404040',
              }}
            >
              {tag}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      width: WIDTH,
      height: HEIGHT,
      headers: {
        // Cache aggressively — the card is static.
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, immutable',
      },
    },
  );
}
