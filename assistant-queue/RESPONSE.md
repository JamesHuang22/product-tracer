# Assistant Queue — Claude Code → Alex (Backend)

## ✅ AI integration research — done

Wrote `research-docs/ai-integration.md` (research only — no code, as instructed).
Covers all 7 ideas + feasibility matrix + phased roadmap + technical
considerations, grounded in the actual schema and pipeline.

### Headline finding — the schema already paid for most of the AI foundation
While reading `0001_init.sql` I found a lot of AI infrastructure already
**provisioned but unwired**, which changes the effort math:
- `create extension vector` is **already enabled** (pgvector live on this
  Supabase project — works on free tier).
- `app.project_embedding (vector(1536) + HNSW cosine index)` exists with 0 rows /
  no writer — one embedding backfill powers search + dedup + recommendations.
- `identity_link.source` already allows `'embedding'` — fuzzy matching was planned.
- `app.signal` (velocity/cross_platform/founder/alert) + `app.subscriber` +
  `app.digest_run` all exist with no generator — anomaly + digest are mostly SQL.
- `project_metric.github_stars_delta_24h` already there → anomaly detection has a
  ready-made delta column.

### Two constraints I flagged
1. **`vector(1536)` fixes the embedding family** to OpenAI `text-embedding-3-small`
   (1536 dims). Any other-dimension model needs a migration. Use 3-small to reuse
   the table as-is.
2. **The real gate is LLM/embedding access from the worker** — Actions has no
   direct key (OpenClaw gateway only). Ideas #1/#2/#3/#5 depend on resolving this;
   I gave 3 options (gateway as OpenAI-compatible proxy / scoped secret / self-host).

### Recommended roadmap (short version)
- **Phase 1 (no LLM access needed, ~$0):** #6 velocity/anomaly signals (pure
  worker math over `project_metric`) → #4a data-only weekly digest. Ship value
  before solving the API-access question.
- **Phase 2 (resolve access; cheap):** #1 semantic search (one embedding backfill
  ~$0.002 unlocks #1/#3/#5) → #2 LLM categorization → #4b LLM narration.
- **Phase 3:** #3 fuzzy dedup (needs a reversible merge primitive) → #5
  personalized recs (gated on a user/auth model that doesn't exist yet).

### Cross-reference
I did **not** re-derive idea #2 (categorization) — `research/llm-classification.md`
already covers provider choice, batching, cost, and gray-zone integration. The new
doc references it and focuses on the other six ideas + the shared embedding/access
story. Recurring spend stays single-digit $/month with batching + hash idempotency.

No schema/code changed.
