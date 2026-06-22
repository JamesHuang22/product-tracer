## Backend Tasks

**P2 — / (mobile)**: Page has horizontal scroll on mobile (375px width)
- *Reproduction*: Set viewport to 375x812 and load /
- *Expected*: No horizontal scroll
- *Actual*: Content overflows viewport

### Rules
- DO touch: apps/worker/, packages/, .github/workflows/
- Do NOT touch: apps/web/, assistant-queue/
- Git author: JamesHuang22 <23440306+JamesHuang22@users.noreply.github.com>

### After completing
1. PR → CI ✅ → merge
2. Apply migration via psql (MCP)
3. Update CHANGELOG.md, DECISIONS.md
4. Write to assistant-queue/RESPONSE.md
