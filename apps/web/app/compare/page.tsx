import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { ArrowLeft } from 'lucide-react';
import { getProjectsByIds } from '@/lib/db';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, translate, type Locale } from '@/lib/i18n';
import { CompareTable } from '@/components/compare-table';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Compare products on OpenProduct',
  description: 'Compare indie products side by side — stars, platforms, category, and more.',
  openGraph: {
    title: 'Compare products on OpenProduct',
    description: 'Compare indie products side by side — stars, platforms, category, and more.',
  },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids: idsParam } = await searchParams;
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale = isLocale(raw) ? (raw as Locale) : DEFAULT_LOCALE;

  // Parse, dedupe, validate as UUIDs, cap at 6 (matches MAX_COMPARE, TASK-032).
  const ids = Array.from(
    new Set((idsParam ?? '').split(',').map((s) => s.trim()).filter((s) => UUID_RE.test(s))),
  ).slice(0, 6);

  const projects = ids.length > 0 ? await getProjectsByIds(ids) : [];

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8 lg:px-6">
      <header className="mb-8">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {translate(locale, 'compare.backToProjects')}
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          {translate(locale, 'compare.title')}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">{translate(locale, 'compare.subtitle')}</p>
      </header>

      {projects.length >= 2 ? (
        <>
          <CompareTable projects={projects} locale={locale} />
          <div className="mt-8">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              {translate(locale, 'compare.addAnother')}
            </Link>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <p className="text-sm text-neutral-500">{translate(locale, 'compare.empty')}</p>
          <div className="mt-5">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {translate(locale, 'compare.backToProjects')}
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
