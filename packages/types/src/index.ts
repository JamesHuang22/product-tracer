import { z } from 'zod';

export const Platform = z.enum(['github', 'product_hunt', 'hacker_news', 'reddit', 'x']);
export type Platform = z.infer<typeof Platform>;

export const ProjectStatus = z.enum(['active', 'dead']);
export type ProjectStatus = z.infer<typeof ProjectStatus>;

export const SignalType = z.enum(['velocity', 'cross_platform', 'founder', 'alert']);
export type SignalType = z.infer<typeof SignalType>;

export const IdentityLinkSource = z.enum(['hard', 'soft', 'embedding', 'manual']);
export type IdentityLinkSource = z.infer<typeof IdentityLinkSource>;

export const Project = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  one_liner: z.string().nullable(),
  category: z.string().nullable(),
  primary_url: z.string().url().nullable(),
  status: ProjectStatus,
  created_at: z.string(),
  updated_at: z.string(),
  // Collector-quality stats (migration 0016) — optional; null until collected.
  last_checked_at: z.string().nullable().optional(),
  issues_count: z.number().nullable().optional(),
  open_prs_count: z.number().nullable().optional(),
  forks_count: z.number().nullable().optional(),
  topics: z.array(z.string()).nullable().optional(),
  last_push_at: z.string().nullable().optional(),
  recent_commits_30d: z.number().nullable().optional(),
});
export type Project = z.infer<typeof Project>;
