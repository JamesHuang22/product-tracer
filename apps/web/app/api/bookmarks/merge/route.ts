import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { mergeBookmarks } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Cap on slugs accepted per merge — a guest set is small. */
const MAX_SLUGS = 200;

/**
 * POST /api/bookmarks/merge  { slugs: string[] }
 * Merges a guest's localStorage bookmarks into the authenticated account on
 * login (idempotent). Returns the resulting { slugs } set so the client syncs.
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const incoming = (body as { slugs?: unknown })?.slugs;
  const slugs = Array.isArray(incoming)
    ? Array.from(
        new Set(
          incoming
            .filter((s): s is string => typeof s === 'string')
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ).slice(0, MAX_SLUGS)
    : [];

  try {
    const merged = await mergeBookmarks(user.id, slugs);
    return NextResponse.json({ slugs: merged });
  } catch (err) {
    console.error('bookmark merge failed', err);
    return NextResponse.json({ error: 'merge_failed' }, { status: 500 });
  }
}
