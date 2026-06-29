import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getUser } from '@/lib/supabase/server';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, translate } from '@/lib/i18n';
import { SubmitForm } from '@/components/submit-form';

export const metadata: Metadata = {
  title: 'Submit a product — OpenProduct',
};

export const dynamic = 'force-dynamic';

export default async function SubmitPage() {
  const user = await getUser();
  if (!user) redirect('/login');

  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(raw) ? (raw as 'en' | 'zh') : DEFAULT_LOCALE;

  return (
    <main className="mx-auto max-w-xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{translate(locale, 'submit.title')}</h1>
        <p className="mt-2 text-sm text-neutral-500">{translate(locale, 'submit.subtitle')}</p>
      </header>
      <SubmitForm />
    </main>
  );
}
