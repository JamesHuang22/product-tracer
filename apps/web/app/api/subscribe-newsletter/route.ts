import { NextResponse } from 'next/server';
// import { subscribeNewsletter } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/subscribe-newsletter
 *
 * TEMPORARILY DISABLED (TASK-029) until an official email domain is set up.
 * The implementation below is commented out and the route returns 501. The DB
 * table (app.newsletter_subscriber) and subscriber data are untouched.
 *
 * To re-enable: restore the import above and the commented implementation, and
 * delete this 501 stub (see TASK-017 for the original feature).
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Newsletter subscription is temporarily disabled' },
    { status: 501 },
  );
}

/*
// Pragmatic email shape check — full RFC validation belongs to the mail
// provider; this just rejects obvious junk before it hits the table.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let email: unknown;
  try {
    email = (await request.json())?.email;
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  if (typeof email !== 'string') {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalized) || normalized.length > 254) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }

  try {
    await subscribeNewsletter(normalized);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('newsletter subscribe failed', err);
    return NextResponse.json({ error: 'subscribe_failed' }, { status: 500 });
  }
}
*/
