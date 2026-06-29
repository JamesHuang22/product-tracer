import { NextResponse } from 'next/server';
import { subscribeNewsletter } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Pragmatic email shape check — full RFC validation belongs to the mail
// provider; this just rejects obvious junk before it hits the table.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/subscribe-newsletter  { email }
 * Captures a landing-page newsletter signup. Idempotent — a repeat email
 * succeeds quietly. Returns { success: true } or { error }.
 */
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
