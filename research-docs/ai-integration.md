# Research — AI Integration for product-tracer

> Status: **research only — no code in this document.** Feasibility, cost, effort,
> and a phased roadmap for the seven AI capability ideas, grounded in the schema
> and pipeline that already exist in this repo.
>
> Companion doc: [`research/llm-classification.md`](../research/llm-classification.md)
> already covers idea #2 (AI categorization) in depth — provider comparison,
> batching, cost, and a gray-zone integration design. This document treats that
> as settled and focuses on the rest, cross-referencing it where they overlap.

---

## 0. What the codebase already gives us (important)

The current schema was clearly designed against an AI-aware PRD, so a surprising
amount of the foundation is **already provisioned but unused**. This dramatically
lowers the effort for several ideas below.

| Asset (in `packages/db/migrations/0001_init.sql`) | State | Unlocks |
|---|---|---|
| `create extension if not exists vector;` | **enabled** (pgvector live on this Supabase project) | embeddings, semantic search, fuzzy dedup, recommendations |
| `app.project_embedding (embedding vector(1536), source_text_hash, model_version)` + **HNSW cosine index** | table exists, **0 rows / no writer** | #1 search, #3 dedup, #5 recommendations all share this one table |
| `app.identity_link.source` enum includes `'embedding'` | allowed value, never written | #3 embedding-based identity matching was a planned tier (PRD §6 "T2") |
| `app.signal (type ∈ velocity/cross_platform/founder/alert, severity, score, linked_snapshot_ids)` | table exists, no generator | #4 digest source, #6 anomaly/velocity alerts |
| `app.subscriber` + `app.digest_run` | tables exist, no sender | #4 weekly digest delivery + open/click tracking |
| `app.project_metric (… github_stars_delta_24h, date)` | written by metrics rollup | #6 anomaly detection has a ready-made delta column |
| `apps/worker/src/quality/classifier.ts` (rule-based, 0–100, `KEEP_THRESHOLD=40`) | running | #2 pre-filter so the LLM only sees the gray zone |

Two facts worth pulling out:

- **`vector(1536)` fixes the embedding model family.** 1536 dims = OpenAI
  `text-embedding-3-small` (or legacy `ada-002`). Using a model with a different
  dimension (e.g. `bge-small` 384, `gte-base` 768, Voyage 1024) means either a
  migration to change the column width or a second embedding column. Match
  `text-embedding-3-small` to use the table as-is.
- **One embedding per project powers three features.** #1, #3, and #5 are not
  three projects — they're one embedding backfill + three different queries over
  the same `project_embedding` table. Build the embedding writer once.

### The one hard constraint: LLM/embedding API access from the worker
Collectors run in **GitHub Actions** and have no direct LLM/embedding API key —
access is only via the **OpenClaw gateway**. Every idea that needs an LLM or an
embedding endpoint inherits this. Options (see §9 for detail):

1. **OpenClaw gateway as an OpenAI-compatible proxy** — point an OpenAI-style
   client at the gateway base URL + a gateway token stored as a GitHub secret.
   Preferred if the gateway exposes `/embeddings` and `/chat/completions`.
2. **Direct provider key as a GitHub secret** — simplest if policy allows a
   scoped key (OpenAI / Anthropic / DeepSeek) to live in Actions secrets.
3. **Self-hosted embeddings** — run `text-embedding-3-small`-equivalent locally;
   but Actions runners have no GPU and embeddings of 1.5k projects on CPU is slow.
   Only viable on a persistent dev box, not in CI.

Resolving this is the **gating dependency** for ideas #1, #2, #3, #5. Ideas #4
and #6 have meaningful **zero-LLM** versions that ship without it.

---

## 1. Natural-language project search (semantic search)

**Idea:** "AI tools for video editing launched this month" → rank projects by
semantic similarity over `name + one_liner` (+ README later), filtered by
`created_at`/category.

- **Data we have:** `name`, `one_liner`, `category`, `primary_url`, `created_at`;
  `project_embedding` table + HNSW index ready.
- **Data missing:** the embeddings themselves (backfill ~1.5k projects, then
  incremental on insert); richer text (README/long description) would help but
  `one_liner` is enough for v1.
- **Cost:** `text-embedding-3-small` ≈ $0.02 / 1M tokens. 1.5k projects × ~60
  tokens ≈ 90K tokens ≈ **$0.002 one-time backfill**; query embedding per search
  is negligible. Effectively free.
- **Effort:** **Medium (1–3 days).** Embedding writer in the worker, a backfill
  script, a `match_projects(query_embedding, k)` SQL RPC (cosine via HNSW), and a
  search box on the web. The table/index already exist, so no schema work for the
  core path.
- **User value:** **High** — this is the headline "smart" feature and the main
  reason the embedding table exists.
- **Dependencies:** LLM/embedding access (§9) → embedding writer → backfill.
  Optional hybrid search (combine pgvector cosine with Postgres FTS on
  `name/one_liner`) noticeably improves precision for keyword-y queries.

## 2. AI-powered categorization

Covered end-to-end in [`research/llm-classification.md`](../research/llm-classification.md).
Summary for this roadmap:

- **Approach:** rule classifier pre-filters; LLM only judges the 30–70 gray zone;
  batch 20–30 projects/request with prompt caching + provider Batch API.
- **Cost:** single-digit **$/month even re-running daily**; far less with
  input-hash idempotency (only new/changed projects).
- **Effort:** **Medium.** Needs migration 0004 (the doc's proposed `llm_category`,
  `llm_tags`, `llm_score`, `status='review'`) + a provider abstraction.
- **Value:** **Medium** — cleaner categories than collector-supplied ones
  (subreddit names, GH topics), improves browse/filter and feeds #1/#5.
- **Dependency:** LLM access (§9). See that doc; not re-derived here.

## 3. Smart dedup / fuzzy identity matching

**Idea:** today `identity_link` is exact-URL only; catch "same project, different
URL" (a GitHub repo and its Product Hunt launch, a renamed project).

- **Data we have:** `project_embedding` (reuse), `identity_link.source='embedding'`
  already a legal value — the schema anticipated exactly this.
- **Approach (cheap → expensive):**
  1. **Embedding candidate generation:** for each project, HNSW nearest neighbours
     above a cosine threshold = merge candidates. Pure pgvector, no LLM.
  2. **LLM adjudication (optional):** only borderline pairs go to an LLM
     ("same product? yes/no + confidence") — tiny volume, writes
     `source='embedding'` or `'manual'`, `confidence` populated.
- **Cost:** candidate generation reuses #1's embeddings (free). LLM adjudication
  only on a handful of ambiguous pairs ≈ cents/run.
- **Effort:** **Medium–Hard (3–5 days).** Merge logic is the risky part: merging
  two `project` rows means re-pointing `identity_link`, `snapshot`,
  `project_metric`, `project_embedding` and picking a survivor. Needs a reversible
  merge (audit/undo) — never hard-delete on an LLM "yes".
- **Value:** **Medium** — fewer duplicate cards, better cross-platform rollups,
  but only a slice of the corpus is genuine cross-platform dupes.
- **Dependencies:** #1 embeddings first; a safe merge primitive.

## 4. Summarization / weekly digest

**Idea:** "This week: 3 new AI video tools, 2 repos crossed 1k stars…" — the
`subscriber` / `digest_run` / `signal` tables exist for precisely this.

- **Two layers, ship them separately:**
  - **4a — data digest (zero-LLM, do first):** SQL over `project_metric` +
    `snapshot` to rank the week's movers (new projects, biggest
    `github_stars_delta_24h`, new cross-platform links) → write `app.signal`
    rows → render a templated email. No AI at all.
  - **4b — LLM narration (add later):** feed the ranked signal list to an LLM for
    a human-readable paragraph. One call/week, ~$0.
- **Cost:** 4a is free; 4b is ~1 LLM call/week (negligible). Email delivery needs
  a provider (Resend/SES) — operational, not AI, cost.
- **Effort:** **Medium.** 4a is mostly SQL + a template + a cron. 4b is a thin
  LLM wrapper. Delivery + unsubscribe + open tracking is the real work
  (`digest_run` already models it).
- **Value:** **High** — recurring re-engagement; turns a dashboard into a product.
- **Dependencies:** 4a none (besides an email sender). 4b needs §9.

## 5. Personalized recommendations

**Idea:** "you follow AI-video projects → here are similar ones." Embedding
similarity over the same vectors.

- **Data we have:** `project_embedding` (reuse #1). **Missing:** any notion of a
  *user* / follows / history — there's no `user`/`follow` table today
  (`subscriber` is email-only). That's the real blocker, and it's not an AI
  problem.
- **Cost:** recommendation query is free (pgvector). Building user accounts +
  follow state is the cost.
- **Effort:** **Hard (1+ week)** — dominated by auth + user data model, not ML.
  The "similar projects" widget on a detail page (no login: "more like this" via
  nearest neighbours) is **Easy** and a good precursor.
- **Value:** Personalized = **Medium** (gated on having users); anonymous "more
  like this" = **Medium-High** for low effort.
- **Dependencies:** #1 embeddings; user/auth model for the personalized version.

## 6. Anomaly detection in project metrics

**Idea:** flag unusual spikes (50→5000 stars/24h). `app.signal type='velocity'`
and `project_metric.github_stars_delta_24h` are already there for this.

- **Approach (start rule/stat, no ML):** per project, compute z-score or
  growth-rate of the daily delta vs its own trailing window; threshold →
  `app.signal(type='velocity', severity)`. Robust, explainable, **zero cost**.
- **ML later (optional):** seasonal/EWMA or isolation-forest on the metric series
  for subtler anomalies — only worth it once there's enough history.
- **Cost:** **$0** (in-DB / worker math).
- **Effort:** **Easy–Medium (1–2 days)** for the rule-based version; the delta
  column and signal table already exist.
- **Value:** **High** — spikes are the core "what's taking off right now" signal
  and directly feed the digest (#4).
- **Dependencies:** none — best **quick win** in the list. Needs a few days of
  `project_metric` history to threshold against.

---

## 7. Feasibility matrix

| # | Idea | Data ready? | Cost | Effort | Value | Key dependency |
|---|---|---|---|---|---|---|
| 6 | Anomaly / velocity signals | ✅ (delta + signal tables) | $0 | Easy–Med | High | none |
| 4a | Data digest (no LLM) | ✅ (signal/subscriber/digest) | ~$0 + email | Med | High | email sender |
| 1 | Semantic search | ⚠ need embeddings | ~$0.002 backfill | Med | High | §9 access |
| 2 | LLM categorization | ✅ (rule pre-filter) | ~$1–8/mo | Med | Med | §9 access |
| 3 | Fuzzy dedup | ⚠ reuse #1 vectors | ~cents | Med–Hard | Med | #1 + safe merge |
| 4b | LLM digest narration | ✅ once 4a done | ~$0 | Low | Med | §9 + 4a |
| 5 | Personalized recs | ❌ no user model | ~$0 ML | Hard | Med | #1 + auth/users |

Cost figures assume `text-embedding-3-small` for embeddings and a Haiku/4o-mini/
DeepSeek-class model for generation (see llm-classification.md §1, §5).

---

## 8. Recommended roadmap

**Phase 1 — quick wins, zero/near-zero cost, no external API needed**
1. **#6 velocity/anomaly signals** — pure worker math over existing
   `project_metric`; writes `app.signal`. No new dependency. Start here.
2. **#4a data-only weekly digest** — SQL ranking → `app.signal` → templated
   email. Stand up the email sender; AI optional. Reuses #6's signals.

> Phase 1 ships real product value with **no LLM access dependency** and almost no
> spend, while #6's signals become the digest's content.

**Phase 2 — embeddings unlocked (resolve §9 first), still cheap**
3. **#1 semantic search** — build the embedding writer + backfill
   `project_embedding` (the table/HNSW index already exist), add a search RPC +
   UI. One backfill (~$0.002) powers #1/#3/#5.
4. **#2 LLM categorization** — implement per llm-classification.md (migration
   0004 + provider abstraction + gray-zone routing). Single-digit $/mo.
5. **#4b** — add LLM narration on top of #4a.

**Phase 3 — advanced, higher effort/impact**
6. **#3 fuzzy dedup** — embedding candidates + optional LLM adjudication + a
   reversible merge primitive. Improves data quality across the board.
7. **#5 personalized recommendations** — only after a user/auth/follow model
   exists; ship the anonymous "more like this" widget as an interim win.

Rationale: front-load the things with **no API dependency and provisioned
schema** (#6, #4a), then do the **one embedding backfill** that unlocks a whole
cluster (#1/#3/#5), and treat anything needing a user model (#5) as last.

---

## 9. Technical considerations

### pgvector on Supabase
- **Already enabled** here (`create extension vector` in 0001) — Supabase ships
  pgvector on **all tiers incl. free**, so no blocker. HNSW cosine index already
  created on `project_embedding`. Free-tier limits are storage/compute, not the
  extension; 1.5k × 1536-dim vectors is tiny (~9 MB).

### Embedding model
- Column is `vector(1536)` → use **`text-embedding-3-small`** (1536) to fit
  as-is; cheapest quality option (~$0.02/1M). Alternatives with other dims need a
  migration. Store `model_version` + `source_text_hash` (columns exist) so you can
  re-embed only changed text and migrate models deliberately.

### LLM / embedding access (the gating item)
- Worker (GitHub Actions) has **no direct key — OpenClaw gateway only.** Resolve
  via, in preference order: (a) gateway as an OpenAI-compatible base URL + token
  secret; (b) a scoped provider key as an Actions secret if policy permits;
  (c) self-host embeddings on a persistent box (no GPU in CI). Build a thin
  provider abstraction (mirrors llm-classification.md §6) so the gateway vs direct
  decision is one config switch, not a rewrite.

### Batch vs real-time
- **Batch (cron) for everything that scales with corpus size:** embedding
  backfill, categorization, dedup candidates, digest. Cheap, retryable, off the
  request path.
- **Real-time only for the query side:** embed the user's search string per query
  (#1) — single tiny call, fine inline.

### Caching & idempotency
- **`source_text_hash`** (embeddings) and an input-hash for LLM classification →
  only re-process changed rows. This is the difference between "pennies/month" and
  "re-embedding 1.5k rows every night."
- **Prompt caching + provider Batch API** (5×/2× discounts) for any LLM step —
  see llm-classification.md §2.
- Cache query embeddings for popular/repeated searches (#1) to skip the call.

### Safety rails
- Never delete/merge on a single LLM "yes" (#3) — require a confidence threshold
  and keep merges reversible.
- On any LLM/embedding failure, **fall back to the existing rule-based behavior**
  and log `raw.collector_error` (e.g. `platform='llm'`/`'embedding'`); a degraded
  AI layer must never take down a collector run.

---

## 10. Bottom line

The schema already paid for most of the AI foundation (pgvector live, embedding /
signal / subscriber / digest tables modeled). The cheapest, highest-value moves
need **no LLM access at all** (#6 velocity signals, #4a digest) — do those first.
The single highest-leverage investment is the **one embedding backfill**, which
turns search, dedup, and recommendations into queries rather than projects. The
real gate is **how the worker reaches an embedding/LLM endpoint** (OpenClaw vs
secret key); settle that before Phase 2. Recurring spend stays in the
**single-digit dollars/month** range with batching + hash-based idempotency.
