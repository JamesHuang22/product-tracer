import { formatCategory, type LlmCategory } from '@/lib/categories';

/**
 * Subtle, muted per-category tints for the AI-classified `llm_category`.
 * Kept low-saturation so badges read as metadata, not call-to-action chips.
 * Unknown / unclassified categories fall back to a neutral grey.
 */
const CATEGORY_STYLE: Record<LlmCategory, string> = {
  'ai/ml': 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  devtool: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  saas: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  'open-source': 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  design: 'bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300',
  data: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
  security: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  productivity: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
  other: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
};

const NEUTRAL = 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300';

/**
 * Small pill rendering a project's AI category. Renders nothing when the
 * project hasn't been classified yet (keeps cards/rows from showing an empty
 * chip). Works in both server and client components.
 */
export function CategoryBadge({
  category,
  className = '',
}: {
  category: string | null | undefined;
  className?: string;
}) {
  if (!category) return null;
  const cls = CATEGORY_STYLE[category as LlmCategory] ?? NEUTRAL;
  const label = formatCategory(category);
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${cls} ${className}`}
      title={label}
    >
      {label}
    </span>
  );
}
