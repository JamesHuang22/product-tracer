# Assistant Queue — Alex → Claude Code (Backend)

## Task: LLM integration foundation — pick a model + wire up the client

### Background
We need an LLM integration in product-tracer. First steps: choose the right model, build the client abstraction, wire it into the worker so other features (semantic search, classification, summarization) can use it. Specifically DO NOT implement any features yet — just the plumbing.

### Requirements

**1. Model selection research**
Pick the best model for our use case based on:
- **Cost**: we want the cheapest viable option. DeepSeek (deepseek-chat) is very cheap ($0.14/M input tokens, $0.28/M output). OpenRouter gives access to many models at cost. Free open-source models (via Ollama/HuggingFace) cost nothing but need compute.
- **Quality**: needs to handle classification, summarization, semantic matching in English + Chinese
- **Availability**: API-based preferred (zero infra), self-hosted is possible but adds overhead
- **Speed**: each call should complete in <5s for near-real-time features

Recommend one model with rationale. If DeepSeek is the pick, note that we already have a DeepSeek API key (stored in macOS Keychain, accessible via OpenClaw gateway but NOT in the worker's env). The worker will need its own key.

**2. Build a reusable LLM client**

Create `apps/worker/src/lib/llm.ts` with:

- A `callLlm(prompt: string, options?: LlmOptions): Promise<LlmResponse>` function
- Support for at least one provider (DeepSeek or OpenRouter or whichever is chosen)
- Configurable via env vars: `LLM_API_KEY`, `LLM_MODEL`, `LLM_BASE_URL` (so we can swap providers)
- Structured output support: `callLlmJson<T>(prompt: string, schema: z.ZodType<T>): Promise<T>` — calls the model and parses structured JSON output
- Retry logic (3 attempts with exponential backoff on 429/5xx)
- Proper error handling and logging
- Graceful skip when NO API key is configured (log + return null — same pattern as YouTube collector's `isAuthConfigured()`)
- Configurable temperature and max_tokens

**3. Add env vars**

Document in the code what env vars are needed:

```
# LLM provider
LLM_API_KEY=sk-...      # placeholder — James will fill in later
LLM_MODEL=deepseek-chat  # or whichever model is chosen
LLM_BASE_URL=https://api.deepseek.com  # or OpenRouter etc
```

**4. Package.json**

Check if `apps/worker/package.json` needs any new dependencies. If using plain fetch (no SDK needed), no changes. If using OpenAI SDK or similar, add it.

**5. Write the research/wiring document**

Write a doc `research-docs/llm-integration-foundation.md` covering:
- Which model was chosen and why
- Architecture diagram (how the LLM client fits into the worker)
- How other features (classification, summarization, search) will use this client
- Cost estimates (how much 1000 classifications would cost, etc.)
- Future: how to swap models/providers

### What NOT to do
- DO NOT implement any actual features (classification, search, etc.)
- DO NOT change any existing collectors or scripts
- DO NOT touch frontend files
- DO NOT read or commit any real API keys

### Files to touch
- `apps/worker/src/lib/llm.ts` (new)
- `apps/worker/package.json` (maybe, if deps needed)
- `research-docs/llm-integration-foundation.md` (new)

### DO NOT touch
- `apps/web/` (frontend)
- Any existing collector or script
- Migration SQL files
- GitHub workflows

### Verification
- `pnpm --filter @product-tracer/worker typecheck` passes
- The LLM client can be imported but does not call any external API without LLM_API_KEY set
- No real API keys leaked

---

Execute. Write RESPONSE.md when done.
