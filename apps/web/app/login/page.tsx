import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, translate } from '@/lib/i18n';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getUser } from '@/lib/supabase/server';
import { AuthForm } from './auth-form';

export const metadata: Metadata = {
  title: 'Sign in — OpenProduct',
  description: 'Sign in to sync your bookmarks across devices.',
};

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  // Already signed in → straight to the account page.
  const user = await getUser();
  if (user) redirect('/account');

  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(raw) ? (raw as 'en' | 'zh') : DEFAULT_LOCALE;

  return (
    <main className="mx-auto flex max-w-6xl flex-col items-center px-6 py-20">
      {isSupabaseConfigured() ? (
        <AuthForm />
      ) : (
        <div className="mx-auto w-full max-w-sm rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
          {translate(locale, 'auth.notConfigured')}
        </div>
      )}
    </main>
  );
}
