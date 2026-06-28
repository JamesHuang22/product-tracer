import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

/**
 * GET /auth/callback
 *
 * Handles both auth link shapes so confirmation works regardless of which
 * Supabase email template is active:
 *   • PKCE / OAuth  → ?code=...            → exchangeCodeForSession
 *   • OTP fallback  → ?token_hash=&type=   → verifyOtp
 *
 * The token-hash path (also served by /auth/confirm) is device-independent;
 * the code path requires the verifier cookie set at sign-up, so it only works
 * on the same browser. On any failure we land on a friendly error page rather
 * than a dead end.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/bookmarks';

  if (isSupabaseConfigured()) {
    const supabase = await createClient();

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, origin));
    } else if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash });
      if (!error) return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL('/auth/auth-code-error', origin));
}
