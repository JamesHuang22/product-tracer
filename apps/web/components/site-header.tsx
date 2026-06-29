'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { useI18n } from '@/lib/i18n-context';
import type { MessageKey } from '@/lib/i18n';

const NAV_LINKS: { href: string; key: MessageKey }[] = [
  { href: '/dashboard', key: 'nav.dashboard' },
  { href: '/projects', key: 'nav.projects' },
  { href: '/youtube-insights', key: 'nav.insights' },
  { href: '/trends', key: 'nav.trends' },
  { href: '/bookmarks', key: 'nav.bookmarks' },
];

export function SiteHeader({ userEmail }: { userEmail: string | null }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const authed = userEmail !== null;

  const linkCls =
    'text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50';

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/80 backdrop-blur dark:border-neutral-800/70 dark:bg-neutral-950/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <span className="inline-block size-2 rounded-full bg-emerald-500" aria-hidden />
          OpenProduct
        </Link>

        {/* Desktop nav (>= sm) */}
        <nav className="hidden items-center gap-4 text-sm sm:flex sm:gap-6">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={linkCls}>
              {t(l.key)}
            </Link>
          ))}
          <LanguageSwitcher />
          <ThemeToggle />
          {authed ? (
            <UserMenu email={userEmail} />
          ) : (
            <Link href="/login" className={linkCls}>
              {t('nav.signIn')}
            </Link>
          )}
        </nav>

        {/* Mobile controls (< sm): theme toggle stays reachable; links collapse
            behind a hamburger so nothing overflows a 375px viewport. */}
        <div className="flex items-center gap-1.5 sm:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={t(open ? 'nav.close' : 'nav.menu')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-50"
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown panel */}
      {open && (
        <nav className="flex flex-col gap-1 border-t border-neutral-200/70 px-6 py-3 text-sm sm:hidden dark:border-neutral-800/70">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`py-1.5 ${linkCls}`}
            >
              {t(l.key)}
            </Link>
          ))}
          {authed ? (
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className={`py-1.5 ${linkCls}`}
            >
              {t('nav.account')}
            </Link>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className={`py-1.5 ${linkCls}`}
            >
              {t('nav.signIn')}
            </Link>
          )}
          <div className="pt-2">
            <LanguageSwitcher />
          </div>
        </nav>
      )}
    </header>
  );
}
