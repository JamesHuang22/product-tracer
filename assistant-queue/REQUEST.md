# Assistant Queue — Alex → Claude Code (Backend)

## Task: AI integration research for product-tracer

### Goal
Research what AI capabilities can be integrated into product-tracer given the current system architecture. Write a comprehensive research document in `research-docs/ai-integration.md`.

### Context
- We have a monorepo with: worker (collectors, scripts), web (Next.js frontend), DB (Supabase)
- 5 collectors: GitHub, HN, PH, YouTube, Reddit (blocked), X (blocked)
- Data quality pipeline (rule-based classifier) already running
- i18n already built (en + zh)
- We do NOT have a DeepSeek/OpenAI API key accessible to the worker (only via OpenClaw gateway)

### What to research and document

**1. Natural language project search**
Could users search projects by describing what they want? e.g. "Show me AI tools for video editing launched this month" → semantic search over project names, one_liners, and descriptions. This would need embeddings + pgvector.

**2. AI-powered project categorization**
Currently categories are hardcoded (youtube, ai, devtools, etc). Could use LLM to auto-categorize projects from their descriptions + GitHub README. Is this worth the API cost?

**3. Smart dedup / identity matching**
Current identity_link matching is rule-based (exact URL match). Could use fuzzy matching — "Repo A" on GitHub = "Cool App" on PH even without the same URL. LLM or embedding-based.

**4. Summarization / weekly digest**
Generate a human-readable summary of the week's top projects. "This week 3 new AI video tools launched, 2 got 1000+ GitHub stars..." — LLM summarizing from DB data.

**5. Personalized recommendations**
If a user follows projects in the "AI video" space, recommend similar projects. Embedding similarity.

**6. Anomaly detection in project metrics**
Detect unusual growth spikes: from 50→5000 stars in 24h. Could be rule-based or ML-based.

**7. Feasibility assessment**

For each idea, assess:
- **Data requirements**: What data do we already have? What's missing?
- **Cost**: API calls to LLM (~$0.01-0.10 per classification), embeddings, pgvector storage
- **Implementation effort**: easy (<1 day), medium (1-3 days), hard (1+ week)
- **User value**: low/medium/high
- **Dependencies**: What needs to be built first?

**8. Recommended roadmap**

From the list above, recommend a phased approach:
- Phase 1: Quick wins (zero or minimal cost + high value)
- Phase 2: Medium effort (some cost, good value)
- Phase 3: Advanced (costly but high impact)

**9. Technical considerations**
- pgvector setup in Supabase (does the free tier support it?)
- Embedding model options: OpenAI text-embedding-3-small vs free alternatives
- LLM access: we don't have API keys accessible to the worker (only via OpenClaw gateway). Options to solve this.
- Batch processing vs real-time inference
- Caching strategies

### Output
Write the full research document to `research-docs/ai-integration.md` in the repo root (alongside the existing `research-docs/` directory).

### DO NOT implement any code
This is research only. No code changes. Just the document.

---

Execute. Write RESPONSE.md when done.
