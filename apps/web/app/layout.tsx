import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { I18nProvider } from '@/lib/i18n-context';
import { BookmarksProvider } from '@/lib/bookmarks';
import { getUser } from '@/lib/supabase/server';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from '@/lib/i18n';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  // Resolves relative OG / Twitter image URLs (e.g. /og/youtube-insights) to
  // absolute. Overridable via NEXT_PUBLIC_SITE_URL for previews / forks.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://product-tracer.vercel.app'),
  title: 'OpenProduct — Cross-platform indie product signals',
  description:
    'Daily intelligence on indie products gaining traction across GitHub, Hacker News, Product Hunt, and YouTube.',
  alternates: {
    types: {
      'application/rss+xml': [
        { url: '/feed/projects.xml', title: 'OpenProduct — New Projects' },
        { url: '/feed/youtube-insights.xml', title: 'OpenProduct — YouTube Insights' },
      ],
    },
  },
};

// Applies the persisted (or system) theme to <html> before first paint, so a
// dark-mode visitor never sees a white flash. Mirrors the logic in ThemeToggle;
// `theme` is 'dark' | 'light' | 'system' (or absent → system).
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  const user = await getUser();

  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      {/* overflow-x-clip prevents stray horizontal scroll on narrow viewports
          (e.g. 375px mobile) from any full-bleed strip or wide child. `clip`
          (not `hidden`) is used deliberately: it doesn't create a scroll
          container, so the sticky header and the inner overflow-x-auto card
          strips keep working. */}
      <body className="min-h-dvh overflow-x-clip font-sans antialiased">
        <I18nProvider initialLocale={locale}>
          <BookmarksProvider initialUserId={user?.id ?? null}>
            <SiteHeader userEmail={user?.email ?? null} />
            {children}
          </BookmarksProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
