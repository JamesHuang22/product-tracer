import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from './config';

/**
 * Server-side Supabase client bound to the request's cookies. Use in Server
 * Components, Route Handlers, and Server Actions. Cookie writes from Server
 * Components are no-ops (Next forbids them) — the middleware refreshes the
 * session cookie instead, so that's expected and safely swallowed.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — cookie mutation isn't allowed
          // there. The middleware handles session refresh, so ignore.
        }
      },
    },
  });
}

/**
 * Returns the authenticated user (verified against Supabase Auth) or null.
 * Returns null immediately when Supabase isn't configured, so callers stay
 * functional in unconfigured environments.
 */
export async function getUser() {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}
