import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { getBookmarkedSlugs } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bookmarks/ids
 * Returns { slugs } — the authenticated user's bookmarked project slugs
 * (newest-first). 401 when not signed in, so the client falls back to
 * localStorage.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ slugs: [], error: 'unauthenticated' }, { status: 401 });
  try {
    const slugs = await getBookmarkedSlugs(user.id);
    return NextResponse.json({ slugs });
  } catch (err) {
    console.error('bookmark ids lookup failed', err);
    return NextResponse.json({ slugs: [], error: 'lookup_failed' }, { status: 500 });
  }
}
