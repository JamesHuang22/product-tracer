# Decisions — Product Tracer

> Permanent record of architectural, process, and product decisions.
> Each entry: date, decision, rationale, alternatives considered.

## 2026-06-15 — PR-based deployment workflow

**Decision**: Every code change (frontend AND backend) must go through PR → CI/Vercel passes → merge → verify production.

**Rationale**: Vercel Hobby Plan has no rollback; one bad push can take the entire site down. The PR gate ensures preview deployments catch build/runtime errors before they hit production.

**Alternatives considered**: Direct push to main (rejected after Vercel 500 crisis).

---

## 2026-06-15 — Git identity for Vercel compatibility

**Decision**: All commits authored as `JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>`.

**Rationale**: Vercel Hobby Plan only allows deployments from commits by authorized users. External agent commits (authored as CS436finalProject) were blocked.

**Alternatives**: Vercel Pro ($20/mo to add collaborators — not worth it yet).

---

## 2026-06-14 — Session pooler over Transaction pooler

**Decision**: Use Supabase session pooler (`:5432`) instead of transaction pooler (`:6543`) for Vercel serverless.

**Rationale**: Transaction pooler on Supabase free tier has unreliable connection management. After 27 days of idle, pooled connections timed out on every query including `SELECT 1`. Session pooler works reliably.

**Alternatives**: PgBouncer config tuning, connection pooling middleware (would have delayed the fix).

---

## 2026-06-15 — DeepSeek for LLM tasks

**Decision**: Use DeepSeek `deepseek-chat` for classification and AI features.

**Rationale**: Cheapest viable option ($0.14/$0.28 per 1M tokens), strong bilingual EN+ZH, OpenAI-compatible API no SDK needed, JSON mode available.

**Alternatives**: Claude Haiku 4.5 (~$1/$5 per 1M, better but 7× cost), GPT-4o mini (~$0.15/$0.60, competitive), local Ollama (zero cost but no GPU in CI).

---

## 2026-06-10 — Reddit no-OAuth refactor

**Decision**: Use public JSON API (`/r/{sub}/hot.json`) instead of OAuth for Reddit.

**Rationale**: User unable to create Reddit script app due to "Responsible Developer Policy" restrictions. Public endpoint works for read-only top/hot listings.

**Trade-off**: No auth means lower rate limits and may 403 from GitHub Actions IPs.

---

## 2026-05 — LLM over Rule-only classification

**Decision**: Two-tier classification: rule-based for clear good/noise, LLM for gray zone (score 15-39).

**Rationale**: Rules catch 80%+ at zero cost. LLM on 15-39 band costs <$0.02/day and catches edge cases. Combined accuracy > either alone.

---

## Early 2026 — pnpm monorepo

**Decision**: pnpm workspace over npm/turborepo/nx.

**Rationale**: pnpm is the de facto standard for monorepos today. NPM workspaces lack features (no content-addressable store), Turborepo/NX add complexity without benefit at this scale.

---

## Early 2026 — Supabase over raw Postgres

**Decision**: Supabase (hosted Postgres + managed auth + dashboard) over self-hosted or RDS.

**Rationale**: Free tier is generous, manages backups/extensions/pgbouncer, includes project dashboard. `pgvector` support out of box (needed for embeddings). No DevOps overhead.

---

## Early 2026 — Next.js + App Router

**Decision**: Next.js 15 App Router over Remix/CRA/Vite+ReactRouter.

**Rationale**: Best server component + streaming support. Vercel native deployment. i18n via React Context (simple, no next-intl bloat). Tailwind + shadcn for zero-design CSS.
