import { NextResponse } from 'next/server';
import { getProjectsBySlugs } from '@/lib/db';

// Reads the DB per request; never cache at build time.
export const dynamic = 'force-dynamic';

/** Hard cap on slugs honoured per request — bookmarks are a small personal set. */
const MAX_SLUGS = 200;

/**
 * GET /api/bookmarks?slugs=a,b,c
 * Returns { projects: ProjectListItem[] } for the given comma-separated slugs.
 * Empty / missing slugs → empty list. The slug set comes from the visitor's
 * localStorage, so this endpoint is unauthenticated and read-only.
 */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get('slugs') ?? '';
  const slugs = Array.from(
    new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ).slice(0, MAX_SLUGS);

  if (slugs.length === 0) return NextResponse.json({ projects: [] });

  try {
    const projects = await getProjectsBySlugs(slugs);
    return NextResponse.json({ projects });
  } catch (err) {
    console.error('bookmarks lookup failed', err);
    return NextResponse.json({ projects: [], error: 'bookmarks_failed' }, { status: 500 });
  }
}
