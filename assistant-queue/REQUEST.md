## Backend Tasks — high-impact features for Claude Code agents

Pick the **top priority** task below and implement it. Only ONE at a time.

---

### Option A: AI-Powered Project Summaries (`apps/worker/` only)
Generate 2-3 sentence AI summaries for projects without one. Uses existing LLM integration.

**Migration 0013** (new file):
```sql
ALTER TABLE app.project ADD COLUMN ai_summary TEXT;
```

**Script** (`apps/worker/src/scripts/generate-summaries.ts`):
```ts
// For each project WHERE ai_summary IS NULL:
// 1. Build prompt: "Write a 2-3 sentence summary of: {name}. {one_liner}. Category: {llm_category}."
// 2. await callLlmJson(prompt, { maxTokens: 150 })
// 3. UPDATE app.project SET ai_summary = $summary WHERE id = $id
// Rate limit: process 50 per run (DeepSeek is $0.0005/run)
```

**Workflow** (`.github/workflows/generate-summaries.yml`):
- Cron: daily 04:00 UTC
- 10min timeout
- Set LLM_API_KEY + DATABASE_URL secrets
- Node 22, pnpm install + build + script

### Option B: Fuzzy Search (`/search` endpoint + frontend)
PostgreSQL pg_trgm fuzzy search on name + one_liner.

**Migration 0013** (new file):
```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_project_name_trgm ON app.project USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_project_one_liner_trgm ON app.project USING gin (one_liner gin_trgm_ops);
```

**Backend** (proxy from web → DB, OR a simple API route):
- New route: `apps/web/app/api/search/route.ts`
- Query: `SELECT id, name, slug, one_liner, platform, stars, created_at FROM app.project WHERE name % $q OR one_liner % $q ORDER BY GREATEST(similarity(name, $q), similarity(one_liner, $q)) DESC LIMIT 20`

**Frontend** (PR #39):
- Add search input in the projects page header (replacing the current client-side filter)
- Show results as a dropdown or inline filtered list
- Add `/api/search` proxy route

### Option C: Bookmark / Save Projects (localStorage v1)
No auth needed — pure client-side.

**Frontend** (PR #39):
- `apps/web/lib/saved-projects.ts` — read/write localStorage key `saved_projects`
- Star (☆/★) toggle on `/projects` table rows and `/projects/[slug]` page
- New page: `/saved` — reads from localStorage, queries DB for matching projects
- DB query: `SELECT * FROM app.project WHERE slug = ANY($slugs::text[])`

---

### Rules
- DO touch: apps/worker/, packages/, .github/workflows/
- Do NOT touch: apps/web/, assistant-queue/ (unless search impacts web)
- Git author: JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>
- Apply migration: psql "$DATABASE_URL" -f packages/db/migrations/0013_name.sql

### After completing
1. PR → CI ✅ → merge → verify production (HTTP 200)
2. Apply migration via Supabase MCP
3. Update CHANGELOG.md
4. Document decision in DECISIONS.md
5. Write completion summary to assistant-queue/RESPONSE.md
