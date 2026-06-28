import { getLatestProjects } from '@/lib/db';
import { cleanOneLiner } from '@/lib/format';

// Live feed — reflect the latest tracked projects on every request (and never
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
  const projects = await getLatestProjects(50);

  const items = projects
    .map((p) => {
      const url = `${SITE}/projects/${p.slug}`;
      const description = cleanOneLiner(p.one_liner) ?? '';
      const pubDate = new Date(p.created_at).toUTCString();
      return `    <item>
      <title>${escapeXml(p.name)}</title>
      <link>${escapeXml(url)}</link>
      <description>${escapeXml(description)}</description>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>OpenProduct — New Projects</title>
    <link>${SITE}/projects</link>
    <description>New indie projects tracked across GitHub, Hacker News, Product Hunt &amp; YouTube</description>
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
