'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export interface AuthState {
  error?: string;
  message?: string;
}

/**
 * Combined sign-in / sign-up server action driven by the `mode` field.
 * On success the session cookie is set server-side and the user is redirected
 * to /bookmarks. Sign-up may require email confirmation, in which case a
 * message is returned instead of redirecting.
 */
export async function authenticate(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured()) {
    return { error: 'Authentication is not configured on this deployment yet.' };
  }

  const mode = String(formData.get('mode') ?? 'signin');
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) return { error: 'Email and password are required.' };
  if (password.length < 6) return { error: 'Password must be at least 6 characters.' };

  const supabase = await createClient();

  if (mode === 'signup') {
    const h = await headers();
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ?? `https://${h.get('host') ?? 'product-tracer.vercel.app'}`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    if (error) return { error: error.message };
    // Email confirmation enabled → no session yet.
    if (!data.session) {
      return { message: 'Account created. Check your email to confirm, then sign in.' };
    }
    revalidatePath('/', 'layout');
    redirect('/bookmarks');
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  revalidatePath('/', 'layout');
  redirect('/bookmarks');
}

/** Sign out and return to the home page. */
export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  revalidatePath('/', 'layout');
  redirect('/');
}
