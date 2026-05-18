/**
 * Product Hunt Collector
 *
 * 通过 Product Hunt GraphQL API 获取新 launch / upvotes 数据。
 * PRD §3: P0 — 免费。
 * ⚠️ 商用限制: P3 收费前需发邮件 hello@producthunt.com 申请商用许可。
 */

const PH_API = "https://api.producthunt.com/v2/api/graphql";

export interface ProductHuntPost {
  id: string;
  name: string;
  tagline: string;
  url: string;
  votesCount: number;
  commentsCount: number;
  reviewsCount: number;
  reviewsRating: number | null;
  thumbnail: { url: string } | null;
  topics: Array<{ name: string }>;
  createdAt: string;
}

export interface PHCollectorOptions {
  /** fetch 超时 (ms) */
  timeout?: number;
  /** 每批取多少条（API 上限 50） */
  first?: number;
}

/**
 * 获取最近发布的 Product Hunt 项目
 */
export async function fetchRecentPosts(
  options: PHCollectorOptions = {},
): Promise<ProductHuntPost[]> {
  const { timeout = 10_000, first = 20 } = options;
  const token = process.env.PRODUCT_HUNT_TOKEN;
  if (!token) {
    throw new Error("PRODUCT_HUNT_TOKEN env var required");
  }

  const query = `
    query RecentPosts($first: Int!) {
      posts(first: $first, order: NEWEST) {
        nodes {
          id
          name
          tagline
          url
          votesCount
          commentsCount
          reviewsCount
          reviewsRating
          thumbnail { url }
          topics { name }
          createdAt
        }
      }
    }
  `;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(PH_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "product-tracer/0.1",
      },
      body: JSON.stringify({ query, variables: { first } }),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new Error(`PH API responded ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    if (json.errors) {
      throw new Error(`PH API error: ${json.errors[0]?.message}`);
    }

    return (json.data?.posts?.nodes ?? []).map((post: any) => ({
      id: post.id,
      name: post.name,
      tagline: post.tagline,
      url: post.url,
      votesCount: post.votesCount,
      commentsCount: post.commentsCount,
      reviewsCount: post.reviewsCount,
      reviewsRating: post.reviewsRating,
      thumbnail: post.thumbnail,
      topics: post.topics ?? [],
      createdAt: post.createdAt,
    }));
  } finally {
    clearTimeout(timer);
  }
}
