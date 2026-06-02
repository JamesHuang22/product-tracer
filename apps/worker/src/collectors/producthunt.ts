import { z } from 'zod';

const PH_API = 'https://api.producthunt.com/v2/api/graphql';

/**
 * Normalised Product Hunt post — only the fields the collector consumes.
 * A `type` (not `interface`) so it stays assignable to the db layer's
 * `JSONValue` index signature when passed to `sql.json()`.
 */
export type PHProduct = {
  id: number;
  name: string;
  tagline: string;
  url: string;
  votesCount: number;
  commentsCount: number;
  createdAt: string;
  topics: string[];
  website: string;
};

// Raw GraphQL node shape (PH returns string ids and a nested topics edge list).
const PHNode = z.object({
  id: z.string(),
  name: z.string(),
  tagline: z.string().nullable().default(''),
  url: z.string(),
  votesCount: z.number().default(0),
  commentsCount: z.number().default(0),
  createdAt: z.string(),
  website: z.string().nullable().default(''),
  topics: z
    .object({
      edges: z.array(z.object({ node: z.object({ name: z.string() }) })).default([]),
    })
    .default({ edges: [] }),
});

const PHResponse = z.object({
  data: z
    .object({
      posts: z
        .object({
          edges: z.array(z.object({ node: PHNode })).default([]),
        })
        .nullable(),
    })
    .nullable(),
  errors: z.array(z.object({ message: z.string() })).optional(),
});

const FEATURED_QUERY = `
{
  posts(first: %COUNT%, order: RANKING) {
    edges {
      node {
        id
        name
        tagline
        url
        votesCount
        commentsCount
        createdAt
        website
        topics {
          edges {
            node {
              name
            }
          }
        }
      }
    }
  }
}`;

/**
 * Fetch the current top-ranked Product Hunt posts via the v2 GraphQL API.
 *
 * Auth: PH's GraphQL endpoint generally wants a developer bearer token. If
 * `PRODUCT_HUNT_TOKEN` is set we send it; otherwise we attempt the request with
 * just a User-Agent (works for some public read paths) and surface a clear
 * error if PH rejects it.
 */
export async function fetchFeaturedProducts(count = 20): Promise<PHProduct[]> {
  const query = FEATURED_QUERY.replace('%COUNT%', String(Math.min(Math.max(count, 1), 50)));

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'User-Agent': 'product-tracer',
  };
  const token = process.env.PRODUCT_HUNT_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(PH_API, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `Product Hunt query failed: ${res.status} ${res.statusText} — ${body.slice(0, 200)}`,
    );
  }

  const parsed = PHResponse.parse(await res.json());
  if (parsed.errors && parsed.errors.length > 0) {
    throw new Error(
      `Product Hunt GraphQL errors: ${parsed.errors.map((e) => e.message).join('; ')}`,
    );
  }

  const edges = parsed.data?.posts?.edges ?? [];
  return edges.map(({ node }) => ({
    id: Number(node.id),
    name: node.name,
    tagline: node.tagline ?? '',
    url: node.url,
    votesCount: node.votesCount,
    commentsCount: node.commentsCount,
    createdAt: node.createdAt,
    topics: node.topics.edges.map((e) => e.node.name),
    website: node.website ?? '',
  }));
}

// ---------------------------------------------------------------------------
// Noise filter — drop obvious non-product launches
// ---------------------------------------------------------------------------

const NOISE_NAME = /\b(deal|discount|coupon|black\s*friday|cyber\s*monday|giveaway)\b/i;

const NOISE_TOPICS = new Set(['deals', 'tech-deals', 'product-hunt-deals', 'newsletters']);

export function isNoiseProduct(p: PHProduct): boolean {
  if (!p.name.trim()) return true;
  if (NOISE_NAME.test(p.name) || NOISE_NAME.test(p.tagline)) return true;
  if (p.topics.some((t) => NOISE_TOPICS.has(t.toLowerCase().replace(/\s+/g, '-')))) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Slug helper
// ---------------------------------------------------------------------------

/**
 * URL-safe slug for app.project.slug. Falls back to `ph-{id}` if the name
 * yields an empty slug. Truncated to 80 chars; the upstream upsert handles
 * any rare collisions via the unique constraint.
 */
export function productSlug(p: PHProduct): string {
  const slug = p.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || `ph-${p.id}`;
}
