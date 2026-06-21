## Frontend Task: Show AI Summaries on Project Card & Detail Page

Now that the backend agent is building AI-generated project summaries (`app.project.ai_summary`), the frontend needs to display them.

### Show on /projects list:
- In the projects table, if `ai_summary` exists, show the first ~80 chars with a "..." and a hover/click-to-expand tooltip
- Add a subtle ✨ icon or italic text to distinguish AI summaries from original one-liners

### Show on /projects/[slug] detail page:
- Below the title/one-liner, show the full ai_summary in a subtle styled block
- Label it "AI Summary" or "Overview" (i18n key: `detail.ai_summary`)
- Keep it readable — light gray background, rounded corners

### i18n keys to add:
```ts
detail: {
  ai_summary: "AI Summary",
  ai_summary_zh: "AI 概述",
}
```

### Files to touch (ONLY):
- apps/web/app/projects/projects-table.tsx
- apps/web/app/projects/[slug]/page.tsx
- apps/web/lib/i18n.ts

### Rules
- PR → Vercel preview ✅ → merge to main → verify production
- Only touch apps/web/ files
- pnpm --filter @product-tracer/web typecheck must pass
- Wait for backend agent to deploy ai_summary first (migration 0013 + generate-summaries script)
- Git author: JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>

### After completing
1. Update CHANGELOG.md
2. Delete this file
3. Write summary to assistant-queue/FRONTEND_RESPONSE.md
