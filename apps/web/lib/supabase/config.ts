/**
 * Supabase public config + a guard so the whole auth surface degrades
 * gracefully when the env vars aren't set (e.g. a fork or a preview without
 * the keys wired up). When unconfigured, auth UI shows a friendly notice and
 * bookmarks fall back to the original localStorage-only behaviour — the site
 * never 500s for a missing key.
 *
 * Both values are public by design (the anon/publishable key is meant to ship
 * to the browser; row access is gated by RLS + server-side user scoping).
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}
