## Backend Tasks

**P2 — /youtube-insights?view=grid**: Grid shows 2 columns, expected 4
- *Reproduction*: Visit /youtube-insights?view=grid
- *Expected*: 4 column grid layout
- *Actual*: 2 columns

### Rules
- DO touch: apps/worker/, packages/, .github/workflows/
- Do NOT touch: apps/web/, assistant-queue/
- Git author: JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>

### After completing
1. PR → CI ✅ → merge
2. Apply migration via psql (MCP)
3. Update CHANGELOG.md, DECISIONS.md
4. Write to assistant-queue/RESPONSE.md
