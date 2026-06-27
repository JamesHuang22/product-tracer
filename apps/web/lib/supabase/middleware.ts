import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './config';

/**
 * Refreshes the Supabase auth session on every request and writes the rotated
 * tokens back onto the response cookies. This is the @supabase/ssr-recommended
 * pattern: without it, expired access tokens are never refreshed for Server
 * Components and the user silently appears logged out.
 *
 * No-op when Supabase isn't configured.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Touch the user so the session refreshes (rotated tokens land on `response`).
  try {
    await supabase.auth.getUser();
  } catch {
    // Network/JWT issues shouldn't take down the request.
  }

  return response;
}
