import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { voteOnProject } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/vote  { projectId, vote: 1 | -1 }
 * Records the authenticated user's vote on a project. Clicking the same
 * direction twice clears it. Returns the recomputed { upvotes, downvotes,
 * userVote } for the optimistic client. 401 when not signed in.
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  let body: { projectId?: unknown; vote?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const projectId = body.projectId;
  const vote = body.vote;
  if (typeof projectId !== 'string' || projectId.trim() === '') {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (vote !== 1 && vote !== -1) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  try {
    const result = await voteOnProject(user.id, projectId.trim(), vote);
    if (!result.found) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    return NextResponse.json({
      upvotes: result.upvotes,
      downvotes: result.downvotes,
      userVote: result.userVote,
    });
  } catch (err) {
    console.error('vote failed', err);
    return NextResponse.json({ error: 'vote_failed' }, { status: 500 });
  }
}
