import type { Metadata } from 'next';
import { getAllProjects } from '@/lib/db';
import { ProjectsTable } from './projects-table';

export const metadata: Metadata = {
  title: 'Projects — Product Tracer',
  description: 'All tracked indie products across GitHub, sorted by stars.',
};

// Live data — opt out of caching so refreshes reflect the latest collector run.
export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
  const projects = await getAllProjects();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Projects</h1>
        <p className="mt-2 text-sm text-neutral-500">
          {projects.length} tracked indie products. Sorted by GitHub stars.
        </p>
      </header>
      <ProjectsTable projects={projects} />
    </main>
  );
}
