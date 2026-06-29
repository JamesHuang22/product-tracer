import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, translate } from '@/lib/i18n';
import { getUser } from '@/lib/supabase/server';
import { getBookmarkedSlugs, getUserSubmissions, type UserSubmission } from '@/lib/db';
import { signOut } from '@/app/login/actions';

export const metadata: Metadata = {
  title: 'Account — OpenProduct',
  description: 'Manage your account.',
};

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(raw) ? (raw as 'en' | 'zh') : DEFAULT_LOCALE;
  const tr = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  let savedCount = 0;
  try {
    savedCount = (await getBookmarkedSlugs(user.id)).length;
  } catch {
    savedCount = 0;
  }

  let submissions: UserSubmission[] = [];
  try {
    submissions = await getUserSubmissions(user.id);
  } catch {
    submissions = [];
  }

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

  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">{tr('account.title')}</h1>

      <dl className="mt-8 divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        <div className="flex items-center justify-between px-5 py-4">
          <dt className="text-sm text-neutral-500">{tr('account.email')}</dt>
          <dd className="text-sm font-medium">{user.email}</dd>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <dt className="text-sm text-neutral-500">{tr('account.memberSince')}</dt>
          <dd className="text-sm font-medium">{memberSince}</dd>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <dt className="text-sm text-neutral-500">{tr('account.savedCount')}</dt>
          <dd className="text-sm font-medium">
            <Link href="/bookmarks" className="underline-offset-4 hover:underline">
              {savedCount} · {tr('account.viewBookmarks')}
            </Link>
          </dd>
        </div>
      </dl>

      {submissions.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">{tr('submit.mySubmissions')}</h2>
            <Link href="/submit" className="text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
              {tr('submit.title')}
            </Link>
          </div>
          <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {submissions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  {s.project_slug ? (
                    <Link href={`/projects/${s.project_slug}`} className="truncate text-sm font-medium hover:underline">
                      {s.product_name}
                    </Link>
                  ) : (
                    <span className="truncate text-sm font-medium">{s.product_name}</span>
                  )}
                  <p className="text-xs tabular-nums text-neutral-400">{s.created_at}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusCls(s)}`}>
                  {statusLabel(s)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form action={signOut} className="mt-6">
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900"
        >
          {tr('account.signOut')}
        </button>
      </form>
    </main>
  );
}
