'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bookmark } from 'lucide-react';
import type { ProjectListItem } from '@/lib/db';
import { useBookmarks } from '@/lib/bookmarks';
import { useI18n } from '@/lib/i18n-context';
import { ProjectCard } from '@/components/project-card';

/**
 * Renders the visitor's bookmarked projects. The slug set lives in localStorage
 * (client-only), so this fetches project data from `/api/bookmarks` whenever the
 * set changes. Rendered cards are filtered to the live slug set, so un-bookmarking
 * a project removes it instantly without waiting on the refetch.
 */
export function BookmarksList() {
  const slugs = useBookmarks();
  const { t } = useI18n();
  const [items, setItems] = useState<ProjectListItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (slugs.length === 0) {
      setItems([]);
      setLoaded(true);
      return;
    }
    fetch(`/api/bookmarks?slugs=${encodeURIComponent(slugs.join(','))}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setItems(Array.isArray(d.projects) ? d.projects : []);
      })
      .catch(() => {
        /* keep whatever we already have */
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [slugs]);

  const visible = items.filter((p) => slugs.includes(p.slug));

  // Pre-hydration / first fetch in flight: render nothing rather than flashing
  // an empty state that would immediately be replaced.
  if (!loaded) return null;

  if (visible.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 p-12 text-center dark:border-neutral-700">
        <Bookmark className="mx-auto h-8 w-8 text-neutral-300 dark:text-neutral-600" aria-hidden />
        <p className="mt-3 text-sm text-neutral-500">{t('bookmarks.empty')}</p>
        <Link
          href="/projects"
          className="mt-4 inline-flex items-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {t('detail.browseAll')}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {visible.map((p) => (
        <ProjectCard key={p.slug} project={p} />
      ))}
    </div>
  );
}
