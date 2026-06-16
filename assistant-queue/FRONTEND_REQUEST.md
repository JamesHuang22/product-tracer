## Frontend Tasks

### Task 1: Remove one-liner/description from project detail page
On `/projects/[slug]` page, the "one-liner" or description text sometimes shows HTML entities (`&#x27;`) and looks ugly. Remove this section entirely. The project detail page should show:
- Project name (title)
- Platform badges
- "Visit site" link
- "Tracked since" date
- Cross-platform signals section (platform metrics, charts)
- Do NOT show the one-liner/description/abstract at all

Only modify `apps/web/app/projects/[slug]/page.tsx`.

### Task 2: Category badge formatting
In `/projects` page dropdown filter and on project cards/badges everywhere:
- `ai/ml` should display as `AI/ML` (uppercase)
- Check if this needs a DB change or just frontend formatting. Find out where the category is rendered and apply the display transformation there.

### Task 3: Typecheck
```
pnpm --filter @product-tracer/web typecheck
```

## Rules
- PR → wait for Vercel preview ✅ → merge to main → verify production
- Only touch apps/web/ files
