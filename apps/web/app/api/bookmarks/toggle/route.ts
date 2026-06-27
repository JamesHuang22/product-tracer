import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { toggleBookmarkDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/bookmarks/toggle  { slug }
 * Toggles the bookmark for the authenticated user. Returns { bookmarked }.
 * 401 when not signed in (client toggles localStorage instead).
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  let slug: unknown;
  try {
    slug = (await request.json())?.slug;
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (typeof slug !== 'string' || slug.trim() === '') {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  try {
    const { bookmarked, found } = await toggleBookmarkDb(user.id, slug.trim());
    if (!found) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({ bookmarked });
  } catch (err) {
    console.error('bookmark toggle failed', err);
    return NextResponse.json({ error: 'toggle_failed' }, { status: 500 });
  }
}
