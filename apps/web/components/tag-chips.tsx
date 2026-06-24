'use client';

import Link from 'next/link';
import type { Route } from 'next';

/**
 * Small clickable tag chips. Each links to `/projects?tag=<tag>` (the projects
 * table filters by it). Chips often sit inside a card/row that is itself a link
 * with a full-bleed overlay, so they raise above it (`relative z-10`) and stop
 * click propagation so tapping a tag filters rather than opening the project.
 */
export function TagChips({
  tags,
  max,
  className,
}: {
  tags: string[] | null | undefined;
  max?: number;
  className?: string;
}) {
  if (!tags || tags.length === 0) return null;
  const shown = max ? tags.slice(0, max) : tags;

  return (
    <div className={`relative z-10 flex flex-wrap gap-1 ${className ?? ''}`}>
      {shown.map((tag) => (
        <Link
          key={tag}
          href={`/projects?tag=${encodeURIComponent(tag)}` as Route}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-600 transition-colors hover:border-neutral-400 hover:text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:border-neutral-500 dark:hover:text-neutral-100"
        >
          #{tag}
        </Link>
      ))}
    </div>
  );
}
