# AI Skills Learning Roadmap
### Anchored to Tracer (product-tracer monorepo)
**Goal:** Build the skills to compete for SWE / MLE / FDE roles at AI-first startups (Anthropic, OpenAI, etc.), using your own Tracer project as the hands-on lab.

Each phase = real skills + a concrete Tracer feature you ship using them.

---

## How to Read This

| Icon | Meaning |
|------|---------|
| 🧑‍💻 **SWE** | Relevant for Software Engineer roles |
| 🤖 **MLE** | Relevant for Machine Learning Engineer roles |
| 🚀 **FDE** | Relevant for Forward Deployed Engineer roles |
| 🏗️ **Tracer** | The specific Tracer task that puts the skill into practice |

---

## Phase 0 — Foundations (2–3 weeks)
*Before you write a single LLM call, lock down these non-negotiables.*

### Skills
- **TypeScript async mastery** — `Promise.all`, async generators, streaming iterators. Most LLM SDKs are heavily async. You're already in TypeScript for Tracer — deepen it.
- **Python fundamentals** — Even as a TS-first dev, MLE interviews expect Python. Get comfortable with NumPy array operations, `dataclasses`, type hints, and PyTorch tensor basics.
- **Postgres + SQL fluency** — Window functions (`LAG`, `LEAD`, `RANK`), CTEs, `jsonb` operators (`->`, `->>`), and `EXPLAIN ANALYZE`. Tracer's schema is rich — you have real tables to practice on.
- **Git hygiene + monorepo workflow** — PRs, conventional commits, `pnpm` workspace commands. Interviewers look at your GitHub.

### Resources
- [TypeScript Handbook — Advanced Types](https://www.typescriptlang.org/docs/handbook/)
- [Python for JavaScript developers](https://dev.to/ericchapman/python-for-javascript-developers-5ai9) (fast ramp)
- [PostgreSQL Tutorial — Window Functions](https://www.postgresqltutorial.com/postgresql-window-function/)
- [Use the Index, Luke](https://use-the-index-luke.com/) — SQL indexing, directly applies to Tracer's `HNSW` and time-series indexes

### 🏗️ Tracer: Set up local dev + write your first SQL queries
- Get `pnpm web:dev` + `pnpm worker:dev` running cleanly
- Write 3 non-trivial queries against `app.project_metric`: velocity ranking (top 10 projects by `github_stars_delta_24h`), a CTE for cross-platform activity, a window function for 7-day rolling stars

---

## Phase 1 — LLM API Fundamentals & Prompt Engineering (3–4 weeks)
*The #1 skill gap between average and great AI engineers. Learn how models actually behave.*

### Skills
- **Prompt architecture** — System vs. user vs. assistant roles. When few-shot helps vs. hurts. Chain-of-thought. XML tags for structured outputs.
- **Structured outputs** — Tool use / function calling to get reliable JSON back. Zod schema validation on model outputs. Retry on parse failure.
- **Prompt caching** — Anthropic's cache-write vs. cache-read pricing. Breakeven analysis (profitable after ~1K tokens). How to structure prompts to maximize cache hits.
- **Token counting & cost modeling** — `tiktoken` (OpenAI) / Anthropic token count API. Build a cost estimator before you ship any LLM feature.
- **Streaming responses** — Server-sent events, streaming to the browser, when to stream vs. await full response.

### Resources
- [Anthropic Prompt Engineering Guide](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)
- [Anthropic SDK — Tool Use](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [Simon Willison's LLM blog](https://simonwillison.net/) — real-world prompt engineering case studies

### 🏗️ Tracer: Build T1 — Project Summarizer
This is your first production LLM feature. The worker needs to call Claude Haiku and generate `one_liner` for `app.project`.

**What to build:**
```
raw.snapshot (raw_data JSONB with README/description)
  → summarize_worker.ts
  → Claude Haiku (prompt-cached README, structured output)
  → writes project.one_liner + project.seo_description
```

**Skills practiced:**
- Prompt caching: cache the README (long, stable context), leave the task instruction uncached
- Tool use / structured output: define a Zod schema for `{ one_liner: string, seo_description: string }`, validate model output
- Cost tracking: log input/output tokens per call to `raw.collector_error` or a separate cost log
- Idempotency: only re-summarize if `source_text_hash` changed (already in `project_embedding` schema — mirror the pattern)

**Role alignment:** 🧑‍💻 🚀

---

## Phase 2 — Embeddings & Vector Search (3–4 weeks)
*The backbone of T2 identity matching and the skill interviewers probe hardest on for MLE roles.*

### Skills
- **Embedding models** — `text-embedding-3-small` (1536-dim, your schema's choice) vs. `text-embedding-3-large` (3072-dim). When to choose which. Batching API calls.
- **pgvector** — HNSW vs. IVFFlat indexing tradeoffs (HNSW = better recall, higher build cost; IVFFlat = faster build, tunable with `nprobes`). Cosine vs. L2 vs. inner product distances.
- **Hybrid search** — BM25 (full-text) + vector cosine similarity combined with RRF (Reciprocal Rank Fusion). When pure vector search fails (short queries, exact name matches).
- **Evaluation basics** — Precision, recall, F1. How to build a labeled test set. Your PRD already defines the target: precision ≥ 95%, recall ≥ 70% on 100 seed projects.
- **Deduplication strategies** — Approximate nearest-neighbor for finding near-duplicate records.

### Resources
- [pgvector documentation](https://github.com/pgvector/pgvector) — HNSW index options, distance operators
- [Supabase Vector / pgvector guide](https://supabase.com/docs/guides/ai/vector-columns)
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [Pinecone Learning Center — Hybrid Search](https://www.pinecone.io/learn/hybrid-search-intro/)
- [Building a RAG eval harness — Hamel Husain](https://hamel.dev/blog/posts/evals/)

### 🏗️ Tracer: Build T2 — Cross-Platform Identity Matcher
This is your most technically differentiated feature and the best portfolio piece.

**What to build:**
```
New project on platform X (raw.snapshot)
  → identity_matcher.ts
    Step 1: Hard match — check if PH/GH page links to matching handle
    Step 2: Soft match — domain + edit distance ≤ 3 → LLM verify (Haiku)
    Step 3: Embedding fallback — embed project description,
            cosine search app.project_embedding via pgvector,
            top-k candidates → Haiku verify
  → writes app.identity_link (confidence, source)
```

**Skills practiced:**
- Generate and store embeddings via OpenAI `text-embedding-3-small`, write to `app.project_embedding`
- HNSW cosine search query: `SELECT project_id, embedding <=> $1 AS distance FROM app.project_embedding ORDER BY distance LIMIT 5`
- Build the 100-project seed eval set: write a script that loads the truth set, runs matcher, computes precision/recall
- LLM-as-judge: use Claude Haiku as a binary classifier ("are these the same project? respond with JSON `{match: boolean, reasoning: string}`")

**Interview talking point:** "I designed and evaluated a cross-platform entity resolution system using hybrid hard-rule + embedding + LLM-verify pipeline, achieving 96% precision on a 100-record labeled set."

**Role alignment:** 🤖 🧑‍💻 🚀

---

## Phase 3 — Eval Frameworks & LLM Observability (2–3 weeks)
*This is what separates engineers who "use LLMs" from engineers who can ship reliable LLM systems. Heavily tested in MLE and FDE interviews.*

### Skills
- **Eval framework design** — Unit evals (single input/output assertion), model-graded evals (LLM judges another LLM), human-labeled golden sets. Know when to use each.
- **Prompt regression testing** — How to detect when a prompt change degrades output quality. CI hooks for prompt changes.
- **Observability** — Log every LLM call: prompt, response, tokens, latency, cost. Tools: Langfuse (open source), Helicone, Braintrust. Structure logs so you can query them.
- **Failure mode taxonomy** — Hallucination, refusal, format errors, context window overflow, prompt injection. How to defend against each.
- **Cost forecasting** — Model a monthly LLM cost given your usage patterns. Know the breakeven for prompt caching.

### Resources
- [Anthropic Evals Guide](https://docs.anthropic.com/en/docs/test-and-evaluate/eval-intro)
- [Hamel Husain — Your AI product needs evals](https://hamel.dev/blog/posts/evals/)
- [Langfuse docs](https://langfuse.com/docs) — open-source LLM observability, integrates with Anthropic SDK
- [RAGAS](https://docs.ragas.io/) — RAG evaluation framework (Python, but the concepts are language-agnostic)
- [Braintrust evals](https://www.braintrust.dev/docs)

### 🏗️ Tracer: Build an eval harness for T1 + T2
**What to build:**
- A `/scripts/eval-summarizer.ts` that runs T1 against 20 test projects with known good `one_liner` values, scores by semantic similarity (embed both, compare cosine distance), logs pass/fail
- A `/scripts/eval-identity-match.ts` that runs T2 against the 100-project seed set, reports precision/recall, saves results to a JSON file (your "eval baseline")
- Add Langfuse tracing to both workers: every call logs `{prompt, response, model, tokens, latency_ms, cost_usd}`

**Why this matters for interviews:** Being able to say "I built an eval suite with a 100-record labeled set and set a regression baseline" is a top-tier signal for both MLE and FDE roles.

**Role alignment:** 🤖 🚀

---

## Phase 4 — AI System Design & Production Pipelines (3–4 weeks)
*The system design round — the round most candidates bomb. Learn to think end-to-end.*

### Skills
- **Pipeline design** — Fan-out/fan-in patterns. Idempotency. At-least-once vs. exactly-once delivery. Dead-letter queues.
- **Rate limiting & backoff** — Token bucket algorithm. Exponential backoff with jitter. Per-platform budget enforcement. (Your PRD already defines this for the X collector.)
- **Distributed system fundamentals** — Eventual consistency, CAP theorem basics, read replicas, connection pooling. Relevant to Supabase setup.
- **LLM system design patterns** — Batch vs. real-time inference. When to call LLM inline vs. enqueue for async processing. Graceful degradation (if LLM is down, fall back to heuristic).
- **Prompt injection & safety** — How enterprise inputs can break your prompts. Defense patterns: input sanitization, output validation, sandboxed tool calls.

### Resources
- [The System Design Primer (GitHub)](https://github.com/donnemartin/system-design-primer)
- [Alex Xu — System Design Interview Vol. 1 & 2](https://www.amazon.com/System-Design-Interview-insiders-Second/dp/B08CMF2CQF) — read Chapters on Rate Limiter, Notification System, URL Shortener
- [Chip Huyen — Designing Machine Learning Systems](https://www.oreilly.com/library/view/designing-machine-learning/9781098107956/) — Chapters 7-9 on feature pipelines and deployment
- [AWS Builder's Library — Exponential Backoff and Jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)

### 🏗️ Tracer: Build T3 — Signal Scoring Engine
This is your most system-design-rich feature.

**What to build:**
```
Daily cron (00:00 UTC)
  → signal_engine.ts
    1. Query project_metric for all projects — 24h delta
    2. Compute velocity_score: delta / rolling_7d_avg (normalize)
    3. Compute cross_platform_score: count of platforms active in last 24h
    4. LLM tie-break (Haiku): for projects where scores are close,
       "given these two signals, which is more notable for an indie builder?"
    5. Write top signals to app.signal (type, severity, score, description)
    6. Write collector_error rows for any failures
```

**Skills practiced:**
- Token-bucket rate limiting for LLM calls (don't blow budget on a large project set)
- Idempotency: check if a signal for `(project_id, date)` already exists before creating
- Graceful degradation: if Haiku times out, fall back to pure numeric scoring
- System design exercise: draw the full data flow diagram for the 6h collector → daily signal engine → digest send

**Role alignment:** 🧑‍💻 🤖

---

## Phase 5 — Agentic Workflows (4–5 weeks)
*The fastest-evolving area. Agents are now table stakes for FDE roles and are a strong differentiator for SWE/MLE.*

### Skills
- **Tool use / function calling** — Defining tool schemas, handling tool call + tool result turns, multi-turn loops.
- **Multi-step agent design** — Plan → act → observe → revise. When to use single-pass LLM vs. multi-step agent.
- **Agent frameworks** — LangGraph (graph-based, good for complex flows), LangChain (chains + tools), Claude's native multi-turn tool use (no framework needed for simpler cases).
- **MCP (Model Context Protocol)** — Anthropic's open protocol for giving agents access to external tools/data. Critical for FDE roles at Anthropic specifically.
- **Evaluation for agents** — Trajectory eval (not just final output), tool call accuracy, step count efficiency.
- **Safety for agentic systems** — Prompt injection via tool outputs, sandboxing, human-in-the-loop checkpoints.

### Resources
- [Anthropic — Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- [LangGraph documentation](https://langchain-ai.github.io/langgraph/)
- [MCP (Model Context Protocol)](https://modelcontextprotocol.io/introduction)
- [Claude Tool Use documentation](https://docs.anthropic.com/en/docs/build-with-claude/tool-use)
- [Swyx — The Anatomy of Autonomy](https://www.latent.space/p/anatomy-of-autonomy) — agent design patterns

### 🏗️ Tracer: Build T4 — Digest Curation Agent
This is your most "agentic" feature and the best FDE portfolio piece.

**What to build:**
```
digest_agent.ts — multi-step agent using Claude tool use:

  Tool: get_top_signals(date, limit) → Signal[]
  Tool: get_project_details(project_id) → Project + recent metrics
  Tool: get_sent_history(subscriber_id, days=14) → Signal[] (dedup)
  Tool: write_digest(subscriber_id, signal_ids, subject, html_body) → void

  Agent loop:
    1. Call get_top_signals(today, 50)
    2. Call get_sent_history → filter out recently sent
    3. For each candidate: call get_project_details
    4. Select top 5 + write weekly summary paragraph
    5. Call write_digest → triggers Resend email via Notification Engine
```

**Why this is powerful for your portfolio:**
- It's a real production agent, not a toy demo
- Uses Anthropic's native tool use (no framework dependency — shows you understand the fundamentals)
- Has a clear eval: run on 10 simulated subscriber profiles, check dedup works, check top-5 quality
- Extend later: add an MCP server that exposes Tracer data → gives Claude (or any AI client) access to your indie product intelligence

**Role alignment:** 🚀 🧑‍💻 🤖

---

## Phase 6 — Interview Prep & Role-Specific Polish (4–6 weeks, overlapping with Phase 5)
*Run this in parallel with Phase 5 once you have shipped T1-T3.*

### For SWE Interviews
**Coding:**
- Practice Anthropic-style OA format: 4-level progressive problems (rate limiter, in-memory key-value store, LRU cache, file cache). Not LeetCode hard — but must be clean, modular, testable.
- Resource: [interviewing.io — Anthropic prep](https://interviewing.io/anthropic-interview-questions)

**System Design:**
- Practice: "Design the Tracer signal pipeline" (you built it — now explain it cleanly)
- Practice: "Design a RAG system serving 10K queries/second"
- Practice: "Design a distributed rate limiter"

**Values/Culture (Anthropic specific — most candidates fail this round):**
- Prepare 3 stories: (1) a time you changed your mind based on evidence, (2) a time your values were tested, (3) a project you're proud of for reasons beyond technical execution
- Read: [Anthropic's Core Views](https://www.anthropic.com/index/core-views-on-ai-safety)

### For MLE Interviews
**Conceptual depth needed:**
- Transformers from scratch — attention, positional encoding, layer norm. Be able to implement a basic attention module in PyTorch.
- RLHF pipeline — SFT → reward model → PPO. Know DPO as an alternative. You don't need to have run one, but be able to explain the data flow.
- Inference optimization — KV cache, flash attention, quantization (INT8/INT4), batching strategies.

**Resources:**
- [Andrej Karpathy — makemore / nanoGPT series](https://github.com/karpathy/ng-video-lecture) — implement transformers from scratch
- [Chip Huyen — RLHF](https://huyenchip.com/2023/05/02/rlhf.html)
- [LLM Visualization](https://bbycroft.net/llm) — understand transformer internals visually

**Tracer angle:** T2 (identity match with pgvector + embedding) and T3 (signal scoring with LLM) are real MLE work. Frame them as "I designed and evaluated an ML pipeline in production."

### For FDE Interviews
**Scenario prep (most important for FDE):**
- "A customer's LLM integration hallucinates 15% of the time. Walk me through diagnosing it." → Practice answer: check prompt structure → check output parsing → add evals → add guard rails.
- "Scope a 3-month AI deployment for an enterprise client." → Answer using the T-shaped framework: understand their data, define success metrics, build eval harness first, deploy iteratively.
- "What would you build with Anthropic's API for a healthcare company?" → Focus on: safety constraints, eval requirements, compliance considerations, graceful fallback.

**Portfolio for FDE:** Ship the Tracer digest agent (T4) + write a public blog post about how you designed the identity matcher. This is the kind of public artifact that gets attention at Anthropic and OpenAI.

---

## Master Timeline

```
Week  1–3   Phase 0: Foundations + local Tracer dev setup
Week  4–7   Phase 1: Prompt engineering + ship T1 (Summarizer)
Week  8–11  Phase 2: Embeddings + vector search + ship T2 (Identity Matcher)
Week 12–14  Phase 3: Evals + observability + eval harness for T1/T2
Week 15–18  Phase 4: System design + ship T3 (Signal Engine)
Week 19–23  Phase 5: Agents + ship T4 (Digest Curation Agent)
Week 20–26  Phase 6: Interview prep (runs in parallel from Week 20)
```

Total: ~6 months — which is also roughly your P0→P1 Tracer timeline. **You're not studying alongside building; you are building to study.**

---

## Skills × Role Coverage Matrix

| Skill | SWE | MLE | FDE | Tracer Task |
|-------|-----|-----|-----|-------------|
| Prompt engineering + caching | ✅ | ✅ | ✅ | T1 Summarizer |
| Structured outputs / tool use | ✅ | ✅ | ✅ | T1 + T4 Agent |
| Embeddings + pgvector | ✅ | ✅ | ✅ | T2 Identity Match |
| Hybrid search | ✅ | ✅ | ✅ | T2 soft match |
| Eval frameworks + labeled sets | — | ✅ | ✅ | T2 eval harness |
| LLM observability (Langfuse) | ✅ | ✅ | ✅ | All workers |
| Rate limiting + pipeline design | ✅ | — | ✅ | T3 + Collectors |
| Signal scoring / heuristics | ✅ | ✅ | — | T3 Signal Engine |
| Agentic multi-step tool use | ✅ | — | ✅ | T4 Digest Agent |
| MCP server design | ✅ | — | ✅ | Tracer MCP (stretch) |
| SQL + time-series queries | ✅ | — | ✅ | project_metric queries |
| React / Next.js data display | ✅ | — | — | Web frontend (P0) |
| Transformer internals | — | ✅ | — | Study only |
| RLHF / DPO | — | ✅ | — | Study only |

---

## One More Thing: Build in Public

The most consistent path into AI startups in 2026 is **referrals + public artifacts**. As you ship each Tracer phase:

1. **GitHub** — keep the repo public (or at least the interesting parts). Clean commits, good READMEs.
2. **Write one blog post per phase** — "How I built cross-platform identity matching with pgvector and Claude" is exactly the kind of content that gets you noticed.
3. **Post the project** — When T4 is live and sending real emails, post on HN (Show HN), X, and Indie Hackers. Tracer is itself an indie product — dogfood it and show the community.
4. **Start reaching out 6 months before you apply** — Comment thoughtfully on AI researchers' posts, engage with Anthropic/OpenAI blog posts, share your learnings.

---

*Roadmap version: May 2026 | Based on current hiring signals from Anthropic, OpenAI, and fast-growing AI startups*
