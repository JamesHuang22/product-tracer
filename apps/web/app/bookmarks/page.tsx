import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, translate } from '@/lib/i18n';
import { BookmarksList } from './bookmarks-list';

export const metadata: Metadata = {
  title: 'Bookmarks — Product Tracer',
  description: 'Your saved projects.',
};

// Bookmarks live in the visitor's localStorage; nothing to prerender.
export const dynamic = 'force-dynamic';

export default async function BookmarksPage() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(raw) ? (raw as 'en' | 'zh') : DEFAULT_LOCALE;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">
          {translate(locale, 'bookmarks.title')}
        </h1>
      </header>
      <BookmarksList />
    </main>
  );
}
