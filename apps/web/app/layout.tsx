import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { I18nProvider } from '@/lib/i18n-context';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from '@/lib/i18n';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Product Tracer — Cross-platform indie product signals',
  description:
    'Daily intelligence on indie products gaining traction across GitHub, Hacker News, Product Hunt, and YouTube.',
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;

  return (
    <html lang={locale} className={inter.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <I18nProvider initialLocale={locale}>
          <SiteHeader />
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
