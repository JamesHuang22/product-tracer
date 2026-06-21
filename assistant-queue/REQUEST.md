## Backend Task: AI-Powered Project Summaries

Generate 2-3 sentence AI summaries for projects without one. Uses existing DeepSeek LLM integration.

### Migration 0013 (create new file: packages/db/migrations/0013_ai_summary.sql)
```sql
ALTER TABLE app.project ADD COLUMN ai_summary TEXT;
```

### Script (apps/worker/src/scripts/generate-summaries.ts)
```ts
import { callLlm } from '../lib/llm';
// For each project WHERE ai_summary IS NULL (limit 50 per run):
// Build prompt: "Write a 2-3 sentence summary of the project {name}. {one_liner}. Category: {llm_category}. Focus on what it does and who it's for."
// await callLlm(prompt, { maxTokens: 150 })
// UPDATE app.project SET ai_summary = $summary WHERE id = $id
```

### Workflow (.github/workflows/generate-summaries.yml)
- Name: Generate AI Project Summaries
- Trigger: cron '0 4 * * *' + workflow_dispatch
- Steps: checkout → node 22 → pnpm install → pnpm build → pnpm worker generate-summaries
- Timeout: 10 minutes
- Secrets needed: LLM_API_KEY, DATABASE_URL

### Files to create/modify
- NEW: packages/db/migrations/0013_ai_summary.sql
- NEW: apps/worker/src/scripts/generate-summaries.ts
- NEW: .github/workflows/generate-summaries.yml

### Files to NOT touch
- apps/web/ (frontend agent handles this)
- assistant-queue/

### After completing
1. PR → CI ✅ → merge to main → verify HTTP 200
2. Run: psql "$DATABASE_URL" -f packages/db/migrations/0013_ai_summary.sql
3. Update CHANGELOG.md
4. Write summary to assistant-queue/RESPONSE.md
5. Delete this file
