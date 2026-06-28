import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, translate } from '@/lib/i18n';
import { getUser } from '@/lib/supabase/server';
import { getBookmarkedSlugs } from '@/lib/db';
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
