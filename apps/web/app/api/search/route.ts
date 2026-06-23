import { NextResponse } from 'next/server';
import { searchProjects } from '@/lib/db';

// Hits the DB on every request — never cache at build time.
export const dynamic = 'force-dynamic';

/**
 * GET /api/search?q={query}
 * Fuzzy project search (pg_trgm). Returns up to 20 { slug, name, one_liner,
 * stars } hits ranked by name similarity. Empty query → empty list.
 */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  if (!q) return NextResponse.json({ results: [] });

  try {
    const results = await searchProjects(q);
    return NextResponse.json({ results });
  } catch (err) {
    console.error('search failed', err);
    return NextResponse.json({ results: [], error: 'search_failed' }, { status: 500 });
  }
}
