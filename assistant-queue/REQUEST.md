## Backend Task: AI-Powered Project Summaries

Generate 2-3 sentence AI summaries for projects using the existing DeepSeek LLM integration.

### Why
Projects currently have only a one-liner (often from GitHub). An AI-generated summary makes each project page much more scannable and valuable. With 4k+ projects, this is the highest-impact AI feature.

### Migration 0013
New file: `packages/db/migrations/0013_ai_summary.sql`
```sql
ALTER TABLE app.project ADD COLUMN ai_summary TEXT;
```

### Script
New file: `apps/worker/src/scripts/generate-summaries.ts`
```
- Query: SELECT id, name, one_liner, llm_category FROM app.project WHERE ai_summary IS NULL LIMIT 50
- For each: build prompt with name + one_liner + category
- call callLlm(prompt, { maxTokens: 150 })
- UPDATE app.project SET ai_summary = summary WHERE id = $id
- Print progress: "Generated 50/4124 summaries"
```

The LLM prompt format:
```
Write a 2-3 sentence summary of the project "{name}". {one_liner or ''}. Category: {llm_category}. Focus on what it does, who it's for, and why it's interesting.
```

### Workflow
New file: `.github/workflows/generate-summaries.yml`
```yaml
name: Generate AI Summaries
on:
  schedule:
    - cron: '0 4 * * *'
  workflow_dispatch:
jobs:
  generate:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm i -g pnpm@latest
      - run: pnpm install
      - run: pnpm build
      - run: pnpm worker generate-summaries
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          LLM_API_KEY: ${{ secrets.LLM_API_KEY }}
```

### Files to create (3 files):
1. packages/db/migrations/0013_ai_summary.sql
2. apps/worker/src/scripts/generate-summaries.ts
3. .github/workflows/generate-summaries.yml

### IMPORTANT: Do NOT touch
- apps/web/ (frontend agent handles display)
- assistant-queue/

### After completing
1. PR → CI ✅ → merge → verify production HTTP 200
2. Apply migration: psql "$DATABASE_URL" -f packages/db/migrations/0013_ai_summary.sql
3. Update CHANGELOG.md
4. Document in DECISIONS.md if any design decisions
5. Write summary to assistant-queue/RESPONSE.md
6. DELETE THIS FILE (so JBK knows you're done)
