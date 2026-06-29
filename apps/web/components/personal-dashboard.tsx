import Link from 'next/link';
import type { Route } from 'next';
import { ArrowUpRight, Bookmark, ChevronUp, FileText } from 'lucide-react';
import type { ProjectListItem, UserSubmission, UserUpvote } from '@/lib/db';
import { translate, type Locale, type MessageKey } from '@/lib/i18n';
import { localizedText } from '@/lib/format';

type ActivityItem = {
  kind: 'submission' | 'upvote';
  title: string;
  date: string;
  href: string | null;
};

/**
 * Personalized dashboard for signed-in users (TASK-018): their submissions,
 * upvotes, bookmarks, and a merged recent-activity timeline. A server component
 * — every section is read-only links, so no client state is needed.
 */
export function PersonalDashboard({
  locale,
  email,
  submissions,
  upvotes,
  bookmarks,
}: {
  locale: Locale;
  email: string | null;
  submissions: UserSubmission[];
  upvotes: UserUpvote[];
  bookmarks: ProjectListItem[];
}) {
  const tr = (key: MessageKey) => translate(locale, key);

  const statusLabel = (s: UserSubmission) => {
    if (s.status === 'approved') return tr('submit.statusApproved');
    if (s.status === 'rejected' || s.review_status === 'invalid') return tr('submit.statusRejected');
    return tr('submit.statusPending');
  };
  const statusCls = (s: UserSubmission) => {
    if (s.status === 'approved')
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
    if (s.status === 'rejected' || s.review_status === 'invalid')
      return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300';
    return 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300';
  };

  // Merged timeline — newest first (YYYY-MM-DD strings sort lexically).
  const activity: ActivityItem[] = [
    ...submissions.map((s) => ({
      kind: 'submission' as const,
      title: s.product_name,
      date: s.created_at,
      href: s.project_slug ? `/projects/${s.project_slug}` : null,
    })),
    ...upvotes.map((u) => ({
      kind: 'upvote' as const,
      title: u.name,
      date: u.created_at,
      href: `/projects/${u.slug}`,
    })),
  ]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, 10);

  const isEmpty =
    submissions.length === 0 && upvotes.length === 0 && bookmarks.length === 0;

  const sectionHead = 'mb-3 flex items-center gap-2 text-lg font-semibold tracking-tight';

  return (
    <main className="mx-auto max-w-5xl px-5 py-12 sm:px-8 lg:px-6">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">{tr('dashboard.welcome')}</h1>
        {email && <p className="mt-1.5 text-sm text-neutral-500">{email}</p>}
      </header>

      {isEmpty && (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <h2 className="text-lg font-semibold tracking-tight">{tr('dashboard.emptyTitle')}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-[1.6] text-neutral-500">
            {tr('dashboard.emptyBody')}
          </p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              {tr('dashboard.browseProjects')}
            </Link>
            <Link
              href="/submit"
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
            >
              {tr('nav.submit')}
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        {/* Your Submissions */}
        {submissions.length > 0 && (
          <section>
            <h2 className={sectionHead}>
              <FileText className="h-4 w-4 text-neutral-400" aria-hidden />
              {tr('submit.mySubmissions')}
            </h2>
            <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {submissions.slice(0, 8).map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    {s.project_slug ? (
                      <Link
                        href={`/projects/${s.project_slug}` as Route}
                        className="truncate text-sm font-medium hover:underline"
                      >
                        {s.product_name}
                      </Link>
                    ) : (
                      <span className="truncate text-sm font-medium">{s.product_name}</span>
                    )}
                    <p className="text-xs tabular-nums text-neutral-400">{s.created_at}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusCls(s)}`}
                  >
                    {statusLabel(s)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Your Upvotes */}
        {upvotes.length > 0 && (
          <section>
            <h2 className={sectionHead}>
              <ChevronUp className="h-4 w-4 text-emerald-500" aria-hidden />
              {tr('dashboard.yourUpvotes')}
            </h2>
            <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
              {upvotes.slice(0, 8).map((u) => (
                <li key={u.slug} className="flex items-center justify-between gap-3 px-4 py-3">
                  <Link
                    href={`/projects/${u.slug}` as Route}
                    className="min-w-0 truncate text-sm font-medium hover:underline"
                  >
                    {u.name}
                  </Link>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                    <ChevronUp className="h-3 w-3" aria-hidden />
                    {u.upvotes}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Bookmarked Projects */}
      {bookmarks.length > 0 && (
        <section className="mt-10">
          <h2 className={sectionHead}>
            <Bookmark className="h-4 w-4 text-neutral-400" aria-hidden />
            {tr('dashboard.yourBookmarks')}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bookmarks.slice(0, 9).map((p) => {
              const oneLiner = localizedText(locale, p.one_liner);
              return (
                <Link
                  key={p.id}
                  href={`/projects/${p.slug}` as Route}
                  className="flex flex-col rounded-xl border border-neutral-200 bg-white p-3.5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:shadow-none dark:hover:border-neutral-600"
                >
                  <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    {p.name}
                  </span>
                  {oneLiner && (
                    <span className="mt-1 line-clamp-2 text-xs leading-[1.6] text-neutral-500">
                      {oneLiner}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent Activity */}
      {activity.length > 0 && (
        <section className="mt-10">
          <h2 className={sectionHead}>{tr('dashboard.recentActivity')}</h2>
          <ul className="space-y-2">
            {activity.map((a, i) => {
              const verb =
                a.kind === 'submission'
                  ? tr('dashboard.activitySubmitted')
                  : tr('dashboard.activityUpvoted');
              const Icon = a.kind === 'submission' ? FileText : ChevronUp;
              return (
                <li
                  key={`${a.kind}-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm dark:border-neutral-800"
                >
                  <Icon className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
                  <span className="shrink-0 text-neutral-500">{verb}</span>
                  {a.href ? (
                    <Link
                      href={a.href as Route}
                      className="min-w-0 flex-1 truncate font-medium hover:underline"
                    >
                      {a.title}
                    </Link>
                  ) : (
                    <span className="min-w-0 flex-1 truncate font-medium">{a.title}</span>
                  )}
                  <span className="shrink-0 text-xs tabular-nums text-neutral-400">{a.date}</span>
                  {a.href && <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-neutral-300" aria-hidden />}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
