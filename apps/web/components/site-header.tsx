import Link from 'next/link';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/80 backdrop-blur dark:border-neutral-800/70 dark:bg-neutral-950/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="inline-block size-2 rounded-full bg-emerald-500" aria-hidden />
          Product Tracer
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link
            href="/projects"
            className="text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-50"
          >
            Projects
          </Link>
        </nav>
      </div>
    </header>
  );
}
