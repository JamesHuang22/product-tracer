import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Product Tracer',
  description: 'Cross-platform indie product signal tracker',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
