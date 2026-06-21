import { getVideoInsights } from '@/lib/db';

// Live feed — reflect the latest analysed videos on every request (and never
// touch the DB at build time).
export const dynamic = 'force-dynamic';

const SITE = 'https://product-tracer.vercel.app';

/** Escape the five XML predefined entities for safe text/attribute content. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const insights = await getVideoInsights(50);

  const items = insights
    .map((vi) => {
      const description = vi.key_insight ?? vi.key_insight_zh ?? '';
      const title = vi.channel_title ? `${vi.video_title} — ${vi.channel_title}` : vi.video_title;
      const parts = [
        `      <title>${escapeXml(title)}</title>`,
        `      <link>${escapeXml(vi.video_url)}</link>`,
        `      <description>${escapeXml(description)}</description>`,
        `      <guid isPermaLink="true">${escapeXml(vi.video_url)}</guid>`,
      ];
      if (vi.published_at) parts.push(`      <pubDate>${new Date(vi.published_at).toUTCString()}</pubDate>`);
      return `    <item>\n${parts.join('\n')}\n    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Product Tracer — YouTube Insights</title>
    <link>${SITE}/youtube-insights</link>
    <description>LLM-analysed YouTube videos — key takeaways across AI, dev tools, startups &amp; more</description>
    <language>en</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600',
    },
  });
}
