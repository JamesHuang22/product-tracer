import type { Metadata } from 'next';
import { getAllProjects } from '@/lib/db';
import { ProjectsTable } from './projects-table';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, translate } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Projects — Product Tracer',
  description: 'All tracked indie products across GitHub, sorted by stars.',
};

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const projects = await getAllProjects();
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(raw) ? (raw as 'en' | 'zh') : DEFAULT_LOCALE;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{translate(locale, 'nav.projects')}</h1>
        <p className="mt-2 text-sm text-neutral-500">
          {translate(locale, 'projects.subtitle', { count: projects.length })}
        </p>
      </header>
      <ProjectsTable projects={projects} />
    </main>
  );
}
