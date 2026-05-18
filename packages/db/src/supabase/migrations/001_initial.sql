-- product-tracer: 初始迁移 v0.1
-- 两个 schema: raw (append-only collectors) + app (query-ready)

-- ============================================================
-- 1. Enable pgvector extension (用于 T2 identity match embedding)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- 2. app schema
-- ============================================================
CREATE SCHEMA IF NOT EXISTS app;

-- 2a. Project
CREATE TABLE IF NOT EXISTS app.project (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        VARCHAR(120) NOT NULL UNIQUE,
    name        VARCHAR(200) NOT NULL,
    one_liner   VARCHAR(140),
    category    VARCHAR(20) CHECK (category IN ('ai', 'saas', 'devtools', 'mobile', 'design', 'content', 'finance', 'other')),
    primary_url TEXT,
    status      VARCHAR(10) DEFAULT 'unknown' CHECK (status IN ('active', 'dead', 'unknown')),
    seo_title       VARCHAR(70),
    seo_description VARCHAR(160),
    hero_image_url  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_category ON app.project(category);
CREATE INDEX idx_project_status  ON app.project(status);
CREATE INDEX idx_project_slug    ON app.project(slug);

-- 2b. Identity Link (跨平台匹配)
CREATE TABLE IF NOT EXISTS app.identity_link (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES app.project(id) ON DELETE CASCADE,
    platform    VARCHAR(20) NOT NULL CHECK (platform IN ('github', 'producthunt', 'hackernews', 'reddit', 'x')),
    external_id VARCHAR(255) NOT NULL,
    confidence  REAL NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
    source      VARCHAR(20) NOT NULL CHECK (source IN ('hard', 'soft', 'embedding', 'manual')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (platform, external_id)
);
CREATE INDEX idx_identity_project ON app.identity_link(project_id);

-- 2c. Snapshot (原始快照，append-only)
CREATE TABLE IF NOT EXISTS app.snapshot (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID NOT NULL REFERENCES app.project(id) ON DELETE CASCADE,
    platform    VARCHAR(20) NOT NULL CHECK (platform IN ('github', 'producthunt', 'hackernews', 'reddit', 'x')),
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT now(),
    stars       INTEGER,
    forks       INTEGER,
    upvotes     INTEGER,
    comments    INTEGER,
    rank        INTEGER,
    raw_data    JSONB
);
CREATE INDEX idx_snapshot_project  ON app.snapshot(project_id);
CREATE INDEX idx_snapshot_platform ON app.snapshot(platform);
CREATE INDEX idx_snapshot_ts       ON app.snapshot(timestamp);
CREATE INDEX idx_snapshot_raw_gin  ON app.snapshot USING GIN (raw_data);

-- 2d. Project Metric (每天 1 行，供 web 图表)
CREATE TABLE IF NOT EXISTS app.project_metric (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES app.project(id) ON DELETE CASCADE,
    date                DATE NOT NULL,
    github_stars        INTEGER,
    github_stars_delta_24h INTEGER,
    ph_upvotes          INTEGER,
    ph_rank             INTEGER,
    hn_score            INTEGER,
    reddit_mentions     INTEGER,
    UNIQUE (project_id, date)
);
CREATE INDEX idx_metric_project ON app.project_metric(project_id);
CREATE INDEX idx_metric_date    ON app.project_metric(date);

-- 2e. Project Embedding (pgvector)
CREATE TABLE IF NOT EXISTS app.project_embedding (
    project_id      UUID PRIMARY KEY REFERENCES app.project(id) ON DELETE CASCADE,
    embedding       vector(1536),
    source_text_hash VARCHAR(64),
    model_version   VARCHAR(50)
);

-- 2f. Signal (精炼信号)
CREATE TABLE IF NOT EXISTS app.signal (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id          UUID NOT NULL REFERENCES app.project(id) ON DELETE CASCADE,
    type                VARCHAR(20) NOT NULL CHECK (type IN ('velocity', 'cross_platform', 'founder', 'alert')),
    severity            VARCHAR(20) NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'notable', 'important', 'critical')),
    score               SMALLINT NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    title               VARCHAR(200) NOT NULL,
    description         VARCHAR(500),
    linked_snapshot_ids UUID[],
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    sent_in_digest_at   TIMESTAMPTZ
);
CREATE INDEX idx_signal_project  ON app.signal(project_id);
CREATE INDEX idx_signal_type     ON app.signal(type);
CREATE INDEX idx_signal_severity ON app.signal(severity);
CREATE INDEX idx_signal_created  ON app.signal(created_at);

-- 2g. Subscriber
CREATE TABLE IF NOT EXISTS app.subscriber (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    status          VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unsubscribed')),
    preferences     JSONB DEFAULT '{}',
    source          VARCHAR(20) NOT NULL CHECK (source IN ('web_form', 'manual', 'import')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_opened_at  TIMESTAMPTZ
);

-- 2h. Digest Run
CREATE TABLE IF NOT EXISTS app.digest_run (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id       UUID NOT NULL REFERENCES app.subscriber(id) ON DELETE CASCADE,
    sent_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    included_signal_ids UUID[],
    opened_at           TIMESTAMPTZ,
    click_count         INTEGER DEFAULT 0
);
CREATE INDEX idx_digest_subscriber ON app.digest_run(subscriber_id);
CREATE INDEX idx_digest_sent       ON app.digest_run(sent_at);

-- ============================================================
-- 3. raw schema（收集器生数据，append-only）
-- ============================================================
CREATE SCHEMA IF NOT EXISTS raw;

CREATE TABLE IF NOT EXISTS raw.collector_errors (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform    VARCHAR(20) NOT NULL CHECK (platform IN ('github', 'producthunt', 'hackernews', 'reddit', 'x')),
    error_type  VARCHAR(100) NOT NULL,
    payload     JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_errors_platform ON raw.collector_errors(platform);
CREATE INDEX idx_errors_ts       ON raw.collector_errors(occurred_at);
