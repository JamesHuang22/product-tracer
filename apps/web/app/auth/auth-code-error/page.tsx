import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, translate } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Confirmation problem — Product Tracer',
  robots: { index: false },
};

export const dynamic = 'force-dynamic';

/**
 * Landing page for a failed email confirmation (invalid / expired / reused
 * link, or a cross-device PKCE code that couldn't be exchanged). Gives the
 * user a clear next step instead of a raw redirect or a dead "unable to
 * connect" page.
 */
export default async function AuthCodeErrorPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(raw) ? (raw as 'en' | 'zh') : DEFAULT_LOCALE;

  return (
    <main className="mx-auto flex max-w-6xl flex-col items-center px-6 py-20">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{translate(locale, 'auth.errorTitle')}</h1>
        <p className="mt-3 text-sm text-neutral-500">{translate(locale, 'auth.errorBody')}</p>
        <Link
          href="/login"
          className="mt-6 inline-flex items-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {translate(locale, 'auth.backToLogin')}
        </Link>
      </div>
    </main>
  );
}
