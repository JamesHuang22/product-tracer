import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/site-header';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Product Tracer — Cross-platform indie product signals',
  description:
    'Daily intelligence on indie products gaining traction across GitHub, Product Hunt, Hacker News, Reddit, and X.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
