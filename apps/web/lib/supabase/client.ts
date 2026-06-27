'use client';

import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './config';

/**
 * Browser-side Supabase client. Used by client components for auth state
 * (current user, sign out). Session tokens are stored in cookies (configured
 * by @supabase/ssr) so the server can read them too.
 */
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
