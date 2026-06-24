'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { GitFork, Star } from 'lucide-react';
import type { ProjectListItem } from '@/lib/db';
import { fmtCount, cleanOneLiner, localizedText } from '@/lib/format';
import { useI18n } from '@/lib/i18n-context';
import { CategoryBadge } from '@/components/category-badge';
import { BookmarkButton } from '@/components/bookmark-button';
import { TagChips } from '@/components/tag-chips';

// Heat accent matching /projects rows — coloured left border keyed on stars.
function heatBorderClass(stars: number | null | undefined): string {
  if (stars != null && stars >= 1000) return 'border-l-4 border-l-emerald-500';
  if (stars != null && stars >= 100) return 'border-l-4 border-l-amber-500';
  return 'border-l-4 border-l-transparent';
}

/**
 * Standalone project card in the `/projects` mobile-card style, with a bookmark
 * toggle in the corner. Used on `/bookmarks`. The whole card is a link to the
 * detail page; the bookmark button raises itself above the card's click target.
 */
export function ProjectCard({ project }: { project: ProjectListItem }) {
  const { locale } = useI18n();
  const oneLiner = localizedText(locale, cleanOneLiner(project.one_liner));
  const aiSummary = localizedText(locale, project.ai_summary);

  // The whole card is the click target via the link's `::before` overlay, so
  // the tag chips and bookmark button can be interactive siblings (raised with
  // `relative z-10`) without nesting links inside the card anchor.
  return (
    <div
      className={`relative rounded-lg border border-neutral-200 p-4 pr-12 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600 ${heatBorderClass(
        project.github_stars,
      )}`}
    >
      <Link
        href={`/projects/${project.slug}` as Route}
        className="block min-w-0 before:absolute before:inset-0"
      >
        <div className="truncate font-medium">{project.name}</div>
        {oneLiner && <div className="mt-1 line-clamp-2 text-sm text-neutral-500">{oneLiner}</div>}
        {aiSummary && (
          <div className="mt-1 line-clamp-2 text-xs italic text-neutral-400">
            <span aria-hidden>✨ </span>
            {aiSummary}
          </div>
        )}
      </Link>
      <div className="mt-3 flex items-center gap-4 text-xs">
        {project.llm_category && <CategoryBadge category={project.llm_category} />}
        <span className="inline-flex items-center gap-1 tabular-nums text-neutral-600 dark:text-neutral-400">
          <Star className="h-3 w-3" /> {fmtCount(project.github_stars)}
        </span>
        <span className="inline-flex items-center gap-1 tabular-nums text-neutral-500">
          <GitFork className="h-3 w-3" /> {fmtCount(project.github_forks)}
        </span>
      </div>
      {project.tags.length > 0 && <TagChips tags={project.tags} max={5} className="mt-2" />}
      <div className="absolute right-3 top-3">
        <BookmarkButton slug={project.slug} />
      </div>
    </div>
  );
}
