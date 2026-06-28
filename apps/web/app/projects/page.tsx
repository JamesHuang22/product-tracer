import type { Metadata } from 'next';
import { getAllProjects } from '@/lib/db';
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
  const projects = await getAllProjects();
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
      <ProjectsTable projects={localizedProjects} />
    </main>
  );
}
