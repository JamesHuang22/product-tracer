# LLM Integration Foundation — model choice + client wiring

> Scope: **plumbing only.** This documents the model decision and the reusable
> client (`apps/worker/src/lib/llm.ts`) that ships with it. No features
> (classification / search / summarization) are implemented here — this is the
> layer they will all call. Companion docs:
> [`ai-integration.md`](./ai-integration.md) (what to build on top) and
> [`../research/llm-classification.md`](../research/llm-classification.md)
> (the categorization design that will be the first consumer).

---

## 1. Model selection

### Decision: **DeepSeek `deepseek-chat`** as the default provider/model.

| Criterion | DeepSeek `deepseek-chat` | Why it wins for us |
|---|---|---|
| **Cost** | ~$0.14 / 1M input, ~$0.28 / 1M output (off-peak cheaper) | Cheapest viable hosted option; an order of magnitude under GPT-4o-class. |
| **Quality (EN + ZH)** | Strong on both; DeepSeek is natively excellent at Chinese | Our content + UI are bilingual (en/zh i18n already shipped); classification/summarization must handle both. |
| **Availability** | Hosted API, zero infra | No GPU box to run; works straight from GitHub Actions with a key. |
| **Speed** | Typically 1–4s for short completions | Meets the <5s/call target for near-real-time use. |
| **Compatibility** | OpenAI-compatible API incl. JSON mode (`response_format`) | One tiny fetch client serves it and every fallback below — no SDK. |

### Alternatives considered (kept reachable via config, see §5)
| Option | Note |
|---|---|
| **OpenRouter** | Aggregator → one key, many models at cost. Best **fallback/escape hatch**: set `LLM_BASE_URL=https://openrouter.ai/api/v1` + `LLM_MODEL=...` and nothing else changes. Good for A/B-ing models. |
| **OpenAI `gpt-4o-mini`** | ~$0.15/$0.60. Slightly pricier, very mature structured output. Reasonable if DeepSeek availability ever bites. |
| **Claude Haiku 4.5** | Best instruction-following / lowest hallucination; pricier per token but Batch API + prompt caching pull it back. Good upgrade path for quality-sensitive steps. |
| **Self-hosted (Ollama / HF)** | $0 marginal but needs a persistent GPU host; **not viable in CI** (Actions runners have no GPU). Dev-box only. |

### ⚠️ Key-access note (the one operational gotcha)
We already have a DeepSeek API key, but it lives in the **macOS Keychain and is
only reachable via the OpenClaw gateway — it is NOT in the worker's env.** The
worker (local runs *and* GitHub Actions) needs **its own** key exposed as the
`LLM_API_KEY` secret/env var. James will provision this. Until then the client is
a **graceful no-op** (returns `null`, never calls the network — verified).

---

## 2. The client — `apps/worker/src/lib/llm.ts`

OpenAI-compatible Chat Completions over plain `fetch` (no SDK, no new deps).

```
 worker script / future feature
        │  callLlm(prompt, opts)              ← raw text completion
        │  callLlmJson(prompt, zodSchema)     ← JSON mode + validated parse
        ▼
 ┌─────────────────────────────────────────────┐
 │ llm.ts                                       │
 │  • isLlmConfigured()  → key present?         │
 │  • no LLM_API_KEY     → return null (skip)   │
 │  • build messages (system?+user)             │
 │  • POST {BASE_URL}/chat/completions          │
 │  • retry 429/5xx/network/timeout ×3 (backoff)│
 │  • zod-validate response; JSON mode parses   │
 └─────────────────────────────────────────────┘
        │  Authorization: Bearer $LLM_API_KEY
        ▼
   LLM_BASE_URL  (DeepSeek | OpenRouter | OpenAI | …)
```

### Public surface
- `isLlmConfigured(): boolean` — is `LLM_API_KEY` set.
- `callLlm(prompt, options?): Promise<LlmResponse | null>` — `{ content, model, usage }`.
- `callLlmJson<T>(prompt, schema: z.ZodType<T>, options?): Promise<T | null>` —
  requests JSON mode, parses, validates against the zod schema, returns typed `T`.
- `LlmOptions`: `model`, `systemPrompt`, `temperature` (default 0.2),
  `maxTokens` (default 1024), `timeoutMs` (default 60s), `json`, `signal`.

### Behaviour contract
- **Graceful skip:** no key → log + `null` (mirrors collectors' `isAuthConfigured`).
  Nothing calls the network at import time.
- **Retries:** 429 / 5xx / network / per-attempt timeout → up to 3 attempts with
  exponential backoff (+jitter). Client errors (401/400/etc.) fail fast.
- **Cancellation:** caller `signal` aborts immediately (no retry); the internal
  timeout is independent.
- **Safety:** key only read from env; never logged; no key is committed.

### Env vars
```
LLM_API_KEY=sk-...                     # provider key (James fills in)
LLM_MODEL=deepseek-chat                # default if unset
LLM_BASE_URL=https://api.deepseek.com  # default if unset
```

### Dependencies
**None added.** Uses native `fetch` + the existing `zod`. `package.json`
unchanged (an SDK would only add weight; the API is a single POST).

---

## 3. How future features will use this

| Feature (future, not built here) | Call | Notes |
|---|---|---|
| **LLM categorization** (`research/llm-classification.md`) | `callLlmJson(batchPrompt, ClassificationArraySchema)` | Gray-zone projects only; batch 20–30/request; JSON mode gives clean typed rows. |
| **Weekly digest narration** (ai-integration §4b) | `callLlm(rankedSignalsPrompt)` | One call/week over already-ranked `app.signal` rows. |
| **Fuzzy identity adjudication** (ai-integration §3) | `callLlmJson(pairPrompt, {same:boolean,confidence:number})` | Only borderline candidate pairs. |

### ⚠️ Embeddings are a *separate* endpoint — not this client
Semantic **search** / dedup / recommendations need **embeddings**
(`POST /embeddings`), which is a different API from chat completions. This
client is chat-only. Also note **DeepSeek does not currently expose an
embeddings endpoint**, so embeddings will come from OpenAI
(`text-embedding-3-small`, matches the existing `vector(1536)` column) or another
provider — a small sibling client (`embeddings.ts`) when that work starts. Keeping
chat and embeddings as separate clients is intentional: different providers,
different shapes.

---

## 4. Cost estimates

Assumes DeepSeek pricing (~$0.14/1M in, ~$0.28/1M out) and the batched,
summary-only inputs from `llm-classification.md` (~200 input + ~80 output tokens
per project, amortizing the cached system prompt).

| Workload | Input toks | Output toks | Cost |
|---|---|---|---|
| **1,000 classifications** (batched) | ~200K | ~80K | ~$0.028 + ~$0.022 ≈ **$0.05** |
| Full corpus gray zone (~470 projects/llm-classification §5) | ~94K | ~38K | ≈ **$0.024 / run** |
| Weekly digest narration (1 call) | ~2K | ~0.5K | rounding-error |

> Even daily full re-runs land in **single-digit dollars/month**; with input-hash
> idempotency (only changed projects) it's cents. The earlier estimate of
> ~$0.3–0.6/month holds for the incremental, cheapest-model path.

---

## 5. Swapping models / providers (future)

Because the client is OpenAI-compatible and config-driven, switching is **env
only — no code change**:

| Target | `LLM_BASE_URL` | `LLM_MODEL` |
|---|---|---|
| DeepSeek (default) | `https://api.deepseek.com` | `deepseek-chat` |
| OpenRouter (any model) | `https://openrouter.ai/api/v1` | e.g. `deepseek/deepseek-chat`, `openai/gpt-4o-mini` |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o-mini` |

Per-call overrides (`options.model`) let one run mix models (e.g. a cheap model
for bulk classification, a stronger one for borderline adjudication). If a future
provider diverges from the OpenAI shape, add a thin adapter behind the same
`callLlm` signature — callers never see it.

---

## 6. Verification (this change)
- `pnpm --filter @product-tracer/worker typecheck` — passes.
- Importing + calling `callLlm` / `callLlmJson` **without `LLM_API_KEY`** logs a
  skip and returns `null`, making **no network call** — verified by smoke test.
- No real API key read or committed; no collectors/scripts/frontend/migrations
  touched.
