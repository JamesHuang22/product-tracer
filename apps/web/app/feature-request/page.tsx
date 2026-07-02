import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { Lock } from 'lucide-react';
import { getUser } from '@/lib/supabase/server';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, translate } from '@/lib/i18n';
import { FeatureRequestForm } from '@/components/feature-request-form';

export const metadata: Metadata = {
  title: 'Feature request — OpenProduct',
};

export const dynamic = 'force-dynamic';

export default async function FeatureRequestPage() {
  const user = await getUser();

  if (!user) {
    return (
      <main className="mx-auto flex max-w-xl flex-col items-center px-6 py-20">
        <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-900 dark:text-neutral-500">
            <Lock className="size-6" aria-hidden />
          </div>
          <h1 className="mt-5 text-lg font-semibold tracking-tight">
            Sign in to submit a feature request
          </h1>
          <p className="mt-2 text-sm leading-[1.6] text-neutral-500 dark:text-neutral-400">
            You need an account to send feedback. It takes 30 seconds.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Sign in with GitHub
          </Link>
          <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-500">
            Already have an account?{' '}
            <Link href="/login" className="underline underline-offset-2 hover:text-neutral-600 dark:hover:text-neutral-300">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    );
  }

  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(raw) ? (raw as 'en' | 'zh') : DEFAULT_LOCALE;

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{translate(locale, 'feature.pageTitle')}</h1>
        <p className="mt-2 text-sm text-neutral-500">{translate(locale, 'feature.subtitle')}</p>
      </header>
      <FeatureRequestForm />
    </main>
  );
}
