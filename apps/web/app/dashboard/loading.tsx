/**
 * Lightweight skeleton shown while the (force-dynamic) dashboard data loads.
 * Mirrors the hero + stats-grid rhythm of home-content so the swap-in is
 * seamless. Pure CSS (animate-pulse) — no animation lib. (TASK-012)
 */
const bar = 'rounded-md bg-neutral-100 dark:bg-neutral-800';

export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14 lg:px-6">
      <div className="animate-pulse">
        {/* Hero */}
        <div className="max-w-2xl">
          <div className="h-5 w-40 rounded-full bg-neutral-100 dark:bg-neutral-800" />
          <div className={`mt-5 h-10 w-3/4 ${bar}`} />
          <div className={`mt-2 h-10 w-1/2 ${bar}`} />
          <div className={`mt-6 h-5 w-full max-w-xl ${bar}`} />
          <div className={`mt-2 h-5 w-2/3 ${bar}`} />
        </div>

        {/* Stats grid */}
        <div className="mt-10 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-neutral-100 dark:bg-neutral-800" />
          ))}
        </div>

        {/* First section strip */}
        <div className="mt-14">
          <div className={`h-6 w-44 ${bar}`} />
          <div className="mt-5 flex gap-3 overflow-hidden">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 w-60 shrink-0 rounded-xl bg-neutral-100 dark:bg-neutral-800" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
