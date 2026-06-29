import { redirect } from 'next/navigation';
import { getAiSummaryCount, getTotalProjectCount } from '@/lib/db';
import { getUser } from '@/lib/supabase/server';
import { Landing } from '@/components/landing';

// Live stats in the hero/stats strip — reflect the DB on every request.
export const dynamic = 'force-dynamic';

/**
 * Marketing landing page. Signed-in visitors are sent straight to their
 * dashboard (the app proper); everyone else sees the pitch + a Get Started CTA.
 * The former homepage dashboard now lives at /dashboard.
 */
export default async function LandingPage() {
  const user = await getUser();
  if (user) redirect('/dashboard');

  const [productCount, summaryCount] = await Promise.all([
    getTotalProjectCount(),
    getAiSummaryCount(),
  ]);

  return <Landing authed={false} productCount={productCount} summaryCount={summaryCount} />;
}
