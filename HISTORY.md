# History — Product Tracer

> Narrative timeline of major milestones, crises, and turning points.

## 2026-06 — Infrastructure crisis & recovery

### Week 2: Vercel goes down, LLM goes live
- **June 11**: Vercel deployment starts returning 500 ("Application error") on page refresh. Multiple deploy attempts block on Vercel Hobby Plan restrictions — commits from `CS436finalProject` (Alex's git identity) not authorized.
- **June 11-12**: Several failed fix attempts. Root cause turns out to be two separate problems: (1) Vercel Git integration was never properly connected — Claude Code said it "connected to repo" but the config was incomplete; (2) `DATABASE_URL` used transaction pooler `:6543` which had 27-day stale connections and timed out every query.
- **June 12**: James manually redeploys via CLI. Site still 500s.
- **June 14**: James tries again with `npx vercel --prod` — deploys on Node 25.6.1 (no `.node-version` pin). Still broken.
- **June 14 (resolution)**: JamesHuang22 commits `.node-version` (22.x). Claude Opus 4.8 fixes it properly: changes DATABASE_URL from `:6543` (transaction pooler) to `:5432` (session pooler), upgrades Vercel CLI, removes stale connection pool. Site stable.
- **Lesson learned**: Transaction pooler (`:6543`) under Supabase's free tier is unreliable for serverless. Session pooler (`:5432`) works. Never trust "Claude Code set up Git integration" — always verify.

### Week 2: LLM Classification goes live
- **June 15**: James adds `LLM_API_KEY` (DeepSeek) to GitHub secrets. Backend agent creates `llm-classify.ts` + migration 0007 + workflow.
- **June 15**: James applies migration 0007, triggers first run. **62 gray-zone projects classified in 1s. 39 rescues, 1 demote. Cost: $0.0015.**
- **June 16**: Frontend agent adds category filter dropdown + badges (`ai/ml` → `AI/ML`), removes one-liner from detail page.

## 2026-05 — Rapid development phase

### Week 4-5: Core features built
- YouTube collector goes live (OAuth + API key, migration 0005)
- X/Twitter collector written (needs cookies — deprioritized)
- Reddit refactored to no-OAuth (public JSON API — may 403 in CI)
- Signal/Trending engine (migration 0006, 7 rule-based signals)
- Homepage redesigned with stats bar + Latest Activity
- i18n (EN/中文) implemented
- /projects pagination with jump-to-page
- HN/PH detail pages with sparkline trends
- Data quality pipeline (rule-based, 1564 assessed, 21 noise)

### Key decisions
- DeepSeek (not OpenAI/Anthropic) chosen for LLM tasks — cheapest, strong bilingual
- `vector(1536)` dimension matches OpenAI text-embedding-3-small (table pre-built)
- Two-agent architecture (frontend + backend) with PR-based workflow

## 2026-04 — Foundation

### Week 3-4: Monorepo setup
- Scaffold: pnpm workspace, Supabase DB, Vercel project
- GitHub / HN / PH collectors and workflows
- Frontend skeleton: Next.js 15 + Tailwind + shadcn
- Vercel initial deploy (first successful deployment)
- Gmail OAuth, portfolio briefing script
