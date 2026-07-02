import { NextResponse } from 'next/server';
import { getUser } from '@/lib/supabase/server';
import { submitFeatureRequest } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/feature-request  { title, description }
 * Records a feature request for the signed-in user. 401 when not signed in,
 * 400 on validation failure.
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ success: false, error: 'unauthenticated' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: 'bad_request' }, { status: 400 });
  }

  const title = String(body.title ?? '').trim();
  const description = String(body.description ?? '').trim();

  if (title.length < 5 || title.length > 100) {
    return NextResponse.json(
      { success: false, error: 'Title must be 5–100 characters.' },
      { status: 400 },
    );
  }
  if (description.length < 10 || description.length > 5000) {
    return NextResponse.json(
      { success: false, error: 'Description must be 10–5000 characters.' },
      { status: 400 },
    );
  }

  try {
    const { id } = await submitFeatureRequest(user.id, title, description);
    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('feature-request failed', err);
    return NextResponse.json({ success: false, error: 'submit_failed' }, { status: 500 });
  }
}
