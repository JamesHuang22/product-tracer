import type { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { getAllProjects, getRecentlySubmittedProjects } from '@/lib/db';
import { ProjectsTable } from './projects-table';
import { ProjectSearch } from '@/components/project-search';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, translate } from '@/lib/i18n';
import { localizedText } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Projects — OpenProduct',
  description: 'All tracked indie products across GitHub, sorted by stars.',
};

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const [projects, submitted] = await Promise.all([
    getAllProjects(),
    getRecentlySubmittedProjects(),
  ]);
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(raw) ? (raw as 'en' | 'zh') : DEFAULT_LOCALE;

  // The whole list is handed to the client <ProjectsTable>, so every row's
  // one-liner is serialized into the page payload. One-liners are single-column
  // and sometimes Chinese; in English mode, null out predominantly-CJK text
  // server-side so the page source (not just the rendered rows) stays free of
  // stray Chinese. Project names are left intact — the one place CJK is expected.
  const localizedProjects = projects.map((p) => ({
    ...p,
    one_liner: localizedText(locale, p.one_liner),
    ai_summary: localizedText(locale, p.ai_summary),
  }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{translate(locale, 'nav.projects')}</h1>
        <p className="mt-2 text-sm text-neutral-500">
          {translate(locale, 'projects.subtitle', { count: projects.length })}
        </p>
        <div className="mt-5">
          <ProjectSearch />
        </div>
      </header>

      {submitted.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            <span className="inline-block size-1.5 rounded-full bg-emerald-500" aria-hidden />
            {translate(locale, 'submit.recentlySubmitted')}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {submitted.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.slug}` as Route}
                className="flex flex-col rounded-xl border border-neutral-200 bg-white p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-none dark:hover:border-neutral-600"
              >
                <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                  {p.name}
                </span>
                {localizedText(locale, p.one_liner) && (
                  <span className="mt-1 line-clamp-2 text-xs leading-[1.6] text-neutral-500">
                    {localizedText(locale, p.one_liner)}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      <ProjectsTable projects={localizedProjects} />
    </main>
  );
}
