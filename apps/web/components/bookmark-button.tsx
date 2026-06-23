'use client';

import { Bookmark, BookmarkCheck } from 'lucide-react';
import { useBookmark } from '@/lib/bookmarks';
import { useI18n } from '@/lib/i18n-context';

/**
 * Bookmark toggle for a single project.
 *
 * `icon` — compact icon-only button, used inside `/projects` rows and cards.
 * Those rows are themselves links with a full-bleed `::before` overlay, so the
 * button is raised (`relative z-10`) and stops click propagation so toggling a
 * bookmark never navigates.
 *
 * `labeled` — icon + text, used on the project detail header.
 */
export function BookmarkButton({
  slug,
  variant = 'icon',
}: {
  slug: string;
  variant?: 'icon' | 'labeled';
}) {
  const { bookmarked, toggle } = useBookmark(slug);
  const { t } = useI18n();
  const label = bookmarked ? t('detail.bookmarked') : t('detail.bookmark');

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle();
  };

  const Icon = bookmarked ? BookmarkCheck : Bookmark;

  if (variant === 'labeled') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={bookmarked}
        className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
          bookmarked
            ? 'border-emerald-500/40 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
            : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900'
        }`}
      >
        <Icon className="h-4 w-4" aria-hidden />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={bookmarked}
      aria-label={label}
      title={label}
      className={`relative z-10 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors ${
        bookmarked
          ? 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10'
          : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200'
      }`}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}
