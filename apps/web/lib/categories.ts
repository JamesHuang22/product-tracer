/**
 * Canonical LLM category vocabulary (mirrors apps/worker's classifier output).
 * Drives the /projects category filter and badge labels.
 *
 * Kept in its own module — free of any DB import — so client components can
 * use these values without pulling the `postgres` driver into the browser
 * bundle.
 */
export const LLM_CATEGORIES = [
  'ai/ml',
  'devtool',
  'saas',
  'open-source',
  'design',
  'data',
  'security',
  'productivity',
  'other',
] as const;

export type LlmCategory = (typeof LLM_CATEGORIES)[number];

/**
 * Display labels for categories whose canonical value doesn't capitalize
 * cleanly on its own. Everything not listed renders with its raw value.
 */
const CATEGORY_LABELS: Partial<Record<LlmCategory, string>> = {
  'ai/ml': 'AI/ML',
};

/** Human-facing label for a category value (e.g. `ai/ml` → `AI/ML`). */
export function formatCategory(category: string): string {
  return CATEGORY_LABELS[category as LlmCategory] ?? category;
}
