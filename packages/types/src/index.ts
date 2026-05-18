import { z } from "zod";

// ─── Project ────────────────────────────────────────────
export const ProjectCategory = z.enum([
  "ai",
  "saas",
  "devtools",
  "mobile",
  "design",
  "content",
  "finance",
  "other",
]);
export type ProjectCategory = z.infer<typeof ProjectCategory>;

export const ProjectStatus = z.enum(["active", "dead", "unknown"]);
export type ProjectStatus = z.infer<typeof ProjectStatus>;

export const Project = z.object({
  id: z.string().uuid(),
  slug: z.string().max(120),
  name: z.string().max(200),
  oneLiner: z.string().max(140),
  category: ProjectCategory,
  primaryUrl: z.string().url().optional(),
  status: ProjectStatus.default("unknown"),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(160).optional(),
  heroImageUrl: z.string().url().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Project = z.infer<typeof Project>;

// ─── Platform (监控平台枚举) ──────────────────────────
export const Platform = z.enum(["github", "producthunt", "hackernews", "reddit", "x"]);
export type Platform = z.infer<typeof Platform>;

// ─── Identity Link ──────────────────────────────────────
export const IdentityLinkSource = z.enum(["hard", "soft", "embedding", "manual"]);
export type IdentityLinkSource = z.infer<typeof IdentityLinkSource>;

export const IdentityLink = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  platform: Platform,
  externalId: z.string(),
  confidence: z.number().min(0).max(1),
  source: IdentityLinkSource,
  createdAt: z.string().datetime(),
});
export type IdentityLink = z.infer<typeof IdentityLink>;

// ─── Snapshot (原始数据快照) ──────────────────────────
export const Snapshot = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  platform: Platform,
  timestamp: z.string().datetime(),
  stars: z.number().int().nonnegative().optional(),
  forks: z.number().int().nonnegative().optional(),
  upvotes: z.number().int().nonnegative().optional(),
  comments: z.number().int().nonnegative().optional(),
  rank: z.number().int().nonnegative().optional(),
  rawData: z.record(z.unknown()).optional(),
});
export type Snapshot = z.infer<typeof Snapshot>;

// ─── ProjectMetric (时间序列聚合，每天 1 行) ─────────
export const ProjectMetric = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  githubStars: z.number().int().nonnegative().optional(),
  githubStarsDelta24h: z.number().int().optional(),
  phUpvotes: z.number().int().nonnegative().optional(),
  phRank: z.number().int().nonnegative().optional(),
  hnScore: z.number().int().nonnegative().optional(),
  redditMentions: z.number().int().nonnegative().optional(),
});
export type ProjectMetric = z.infer<typeof ProjectMetric>;

// ─── ProjectEmbedding (pgvector) ────────────────────────
export const ProjectEmbedding = z.object({
  projectId: z.string().uuid(),
  embedding: z.array(z.number()),
  sourceTextHash: z.string(),
  modelVersion: z.string(),
});
export type ProjectEmbedding = z.infer<typeof ProjectEmbedding>;

// ─── Signal (精炼信号) ──────────────────────────────────
export const SignalType = z.enum([
  "velocity",
  "cross_platform",
  "founder",
  "alert",
]);
export type SignalType = z.infer<typeof SignalType>;

export const SignalSeverity = z.enum(["info", "notable", "important", "critical"]);
export type SignalSeverity = z.infer<typeof SignalSeverity>;

export const Signal = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  type: SignalType,
  severity: SignalSeverity,
  score: z.number().min(0).max(100),
  title: z.string().max(200),
  description: z.string().max(500),
  linkedSnapshotIds: z.array(z.string().uuid()),
  createdAt: z.string().datetime(),
  sentInDigestAt: z.string().datetime().optional(),
});
export type Signal = z.infer<typeof Signal>;

// ─── Subscriber (订阅者) ────────────────────────────────
export const SubscriberStatus = z.enum(["active", "unsubscribed"]);
export type SubscriberStatus = z.infer<typeof SubscriberStatus>;

export const Subscriber = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  status: SubscriberStatus.default("active"),
  preferences: z
    .object({
      categories: z.array(ProjectCategory).optional(),
      frequency: z.enum(["daily", "weekly"]).default("daily"),
    })
    .optional(),
  source: z.enum(["web_form", "manual", "import"]),
  createdAt: z.string().datetime(),
  lastOpenedAt: z.string().datetime().optional(),
});
export type Subscriber = z.infer<typeof Subscriber>;

// ─── DigestRun (邮件发送记录) ──────────────────────────
export const DigestRun = z.object({
  id: z.string().uuid(),
  subscriberId: z.string().uuid(),
  sentAt: z.string().datetime(),
  includedSignalIds: z.array(z.string().uuid()),
  openedAt: z.string().datetime().optional(),
  clickCount: z.number().int().nonnegative().default(0),
});
export type DigestRun = z.infer<typeof DigestRun>;

// ─── CollectorError (收集器报错) ───────────────────────
export const CollectorError = z.object({
  id: z.string().uuid(),
  platform: Platform,
  errorType: z.string(),
  payload: z.record(z.unknown()).optional(),
  occurredAt: z.string().datetime(),
});
export type CollectorError = z.infer<typeof CollectorError>;
