import Link from 'next/link';
import type { Route } from 'next';
import { ArrowUpRight, Star } from 'lucide-react';
import { getRelatedProjects } from '@/lib/db';
import { cleanOneLiner, fmtCount, localizedText } from '@/lib/format';
import { formatCategory } from '@/lib/categories';
import { translate, type Locale } from '@/lib/i18n';

interface RelatedProjectsProps {
  currentSlug: string;
  category: string | null;
  locale: Locale;
}

/**
 * Async server component for the detail-page recommendation row ("You might also
 * like"): up to 4 mini-cards of other projects in the same llm_category, ordered
 * by GitHub stars. Renders nothing when there's no category or no siblings — so
 * the caller can drop it in unconditionally.
 */
export async function RelatedProjects({ currentSlug, category, locale }: RelatedProjectsProps) {
  const related = await getRelatedProjects(currentSlug, category, 4);
  if (related.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-neutral-500">
        {translate(locale, 'detail.relatedTitle')}
      </h2>
      {category && (
        <p className="mb-4 text-xs text-neutral-400">
          {translate(locale, 'detail.relatedSubtitle', { category: formatCategory(category) })}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {related.map((p) => {
          const oneLiner = localizedText(locale, cleanOneLiner(p.one_liner));
          return (
            <Link
              key={p.id}
              href={`/projects/${p.slug}` as Route}
              className="flex h-full flex-col rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-600"
            >
              <div className="flex items-start justify-between gap-1.5">
                <span className="line-clamp-2 text-sm font-medium text-neutral-900 dark:text-neutral-50">
                  {p.name}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
              </div>
              {oneLiner && (
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-neutral-500">
                  {oneLiner}
                </p>
              )}
              <div className="mt-auto flex items-center gap-1 pt-3 text-xs tabular-nums text-neutral-500">
                <Star className="h-3 w-3" aria-hidden />
                {fmtCount(p.stars)}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
