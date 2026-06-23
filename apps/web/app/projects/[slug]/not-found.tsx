import Link from 'next/link';
import { cookies } from 'next/headers';
import { ArrowRight } from 'lucide-react';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, translate, type Locale } from '@/lib/i18n';

/**
 * Graceful 404 for an unknown project slug (a stale link, or a project dropped
 * by dedup). Centered message + a clear path back to the full list, localized.
 */
export default async function ProjectNotFound() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  return (
    <main className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-5xl font-bold tracking-tight">404</h1>
      <p className="mt-4 text-neutral-500">{translate(locale, 'detail.notFound')}</p>
      <Link
        href="/projects"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {translate(locale, 'detail.browseAll')}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </main>
  );
}
