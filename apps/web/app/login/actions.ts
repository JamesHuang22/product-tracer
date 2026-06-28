'use server';

import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, translate, type MessageKey } from '@/lib/i18n';

export interface AuthState {
  error?: string;
  /** Localized informational notice (e.g. confirmation pending / resent). */
  notice?: string;
  /** True when sign-in failed because the email isn't confirmed yet — the
   *  form then offers a "resend confirmation email" button. */
  canResend?: boolean;
}

async function resolveLocale() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  return isLocale(raw) ? (raw as 'en' | 'zh') : DEFAULT_LOCALE;
}

/** Absolute origin for email redirect links (prefers the explicit site URL). */
async function resolveOrigin() {
  const h = await headers();
  return (
    process.env.NEXT_PUBLIC_SITE_URL ?? `https://${h.get('host') ?? 'product-tracer.vercel.app'}`
  );
}

/**
 * Combined sign-in / sign-up server action driven by the `mode` field. On a
 * successful sign-in (or a sign-up that returns a session) the cookie is set
 * server-side and the user is redirected to /bookmarks. A sign-up that needs
 * email confirmation returns a localized "check your email" notice instead.
 */
export async function authenticate(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = await resolveLocale();
  const t = (key: MessageKey) => translate(locale, key);

  if (!isSupabaseConfigured()) return { error: t('auth.notConfigured') };

  const mode = String(formData.get('mode') ?? 'signin');
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) return { error: 'Email and password are required.' };
  if (password.length < 6) return { error: 'Password must be at least 6 characters.' };

  const supabase = await createClient();

  if (mode === 'signup') {
    const origin = await resolveOrigin();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${origin}/auth/callback` },
    });
    if (error) return { error: error.message };
    // Email confirmation enabled → no session yet.
    if (!data.session) return { notice: t('auth.confirmPending') };
    revalidatePath('/', 'layout');
    redirect('/bookmarks');
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Surface the "confirm your email" case with a resend affordance.
    if (error.code === 'email_not_confirmed') {
      return { error: t('auth.emailNotConfirmed'), canResend: true };
    }
    return { error: error.message };
  }
  revalidatePath('/', 'layout');
  redirect('/bookmarks');
}

/** Resend the sign-up confirmation email for an address. */
export async function resendConfirmation(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const locale = await resolveLocale();
  const t = (key: MessageKey) => translate(locale, key);

  if (!isSupabaseConfigured()) return { error: t('auth.notConfigured') };

  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { error: 'Email is required.' };

  const supabase = await createClient();
  const origin = await resolveOrigin();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) return { error: error.message, canResend: true };
  return { notice: t('auth.resent') };
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
