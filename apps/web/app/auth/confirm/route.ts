import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

/**
 * GET /auth/confirm?token_hash=...&type=email[&next=/path]
 *
 * Server-side email confirmation (the Supabase-recommended SSR flow). The
 * "Confirm signup" email template points here:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
 *
 * Unlike the PKCE `code` flow (see /auth/callback), `verifyOtp` with a token
 * hash needs no code-verifier cookie, so the link works even when the email is
 * opened on a different device/browser than the one that signed up.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/bookmarks';

  if (token_hash && type && isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL('/auth/auth-code-error', origin));
}
