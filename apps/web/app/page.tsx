import Link from 'next/link';
import { ArrowRight, Star } from 'lucide-react';
import { getTopProjects } from '@/lib/db';
import { fmtCount } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const top = await getTopProjects(5);

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
      <section className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
          Tracking {top.length > 0 ? 'live' : 'soon'}
        </span>
        <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
          Cross-platform signals
          <br />
          for <span className="text-neutral-500">indie products.</span>
        </h1>
        <p className="mt-6 text-lg leading-relaxed text-neutral-600 dark:text-neutral-400">
          Daily intelligence on what&rsquo;s gaining traction across GitHub, Product Hunt, Hacker
          News, Reddit, and X &mdash; surfaced into a 5-minute morning read.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            Browse projects
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <span className="text-sm text-neutral-500">
            Daily email digest &middot; <span className="text-neutral-400">coming soon</span>
          </span>
        </div>
      </section>

      {top.length > 0 && (
        <section className="mt-20">
          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Today&rsquo;s top</h2>
            <Link
              href="/projects"
              className="inline-flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              All projects <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <ol className="space-y-2">
            {top.map((p, i) => (
              <li key={p.id}>
                <a
                  href={p.primary_url ?? '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="group block rounded-lg border border-neutral-200 p-4 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600"
                >
                  <div className="flex items-start gap-4">
                    <span className="mt-0.5 w-5 shrink-0 text-right text-xs font-mono tabular-nums text-neutral-400">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium group-hover:text-neutral-900 dark:group-hover:text-neutral-50">
                          {p.name}
                        </span>
                        {p.category && (
                          <span className="shrink-0 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                            {p.category}
                          </span>
                        )}
                      </div>
                      {p.one_liner && (
                        <div className="mt-1 line-clamp-2 text-sm text-neutral-500">
                          {p.one_liner}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 inline-flex items-center gap-1 text-sm tabular-nums text-neutral-500">
                      <Star className="h-3.5 w-3.5" />
                      {fmtCount(p.github_stars)}
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
