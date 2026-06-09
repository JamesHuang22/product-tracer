# Assistant Queue — Claude Code → Alex (Backend)

## ✅ LLM integration foundation — done (plumbing only, no features)

Worker typecheck passes. Graceful skip verified (no key → log + `null`, **zero
network calls**). No features implemented, no collectors/scripts/migrations/
frontend touched.

### Files
| File | What |
|---|---|
| `apps/worker/src/lib/llm.ts` | **New.** Reusable OpenAI-compatible LLM client. |
| `research-docs/llm-integration-foundation.md` | **New.** Model choice + architecture + cost + swap guide. |
| `apps/worker/package.json` | **Unchanged** — native `fetch` + existing `zod`, no SDK/deps needed. |

### Model choice: DeepSeek `deepseek-chat`
Cheapest viable (~$0.14/$0.28 per 1M in/out), strong **bilingual EN+ZH** (matches
our i18n), hosted (zero infra, runs from Actions), OpenAI-compatible incl. JSON
mode, ~1–4s/call (meets <5s). OpenRouter / OpenAI / Haiku all reachable by env
only (see doc §5).

### Client surface (`llm.ts`)
- `isLlmConfigured()` — is `LLM_API_KEY` set.
- `callLlm(prompt, options?) → LlmResponse | null` — `{content, model, usage}`.
- `callLlmJson<T>(prompt, zodSchema, options?) → T | null` — JSON mode + zod-validated.
- `LlmOptions`: `model`, `systemPrompt`, `temperature` (0.2), `maxTokens` (1024),
  `timeoutMs` (60s), `json`, `signal`.
- Retries 429/5xx/network/timeout ×3 with exponential backoff; client errors
  (401/400) fail fast; caller `signal` aborts without retry.
- Returns `null` (never throws) when unconfigured, so callers degrade gracefully.

### Env vars (document only — no real key committed)
```
LLM_API_KEY=sk-...                      # James fills in
LLM_MODEL=deepseek-chat                 # default if unset
LLM_BASE_URL=https://api.deepseek.com   # default if unset
```

### ⚠️ Two heads-up
1. **Worker needs its own key.** The existing DeepSeek key is in the macOS
   Keychain via the OpenClaw gateway — **not in the worker env**. Set `LLM_API_KEY`
   as a local `.env` value + a GitHub secret before any LLM feature runs. Until
   then everything no-ops cleanly.
2. **Embeddings are a separate endpoint, not this client.** Semantic search /
   dedup / recs need `POST /embeddings` — a different API. Also DeepSeek has **no**
   embeddings endpoint, so those will use OpenAI `text-embedding-3-small` (matches
   the existing `vector(1536)` column) via a small sibling `embeddings.ts` when
   that work starts. This client is chat-only by design.

### Note on the shared working tree
A frontend agent is operating concurrently in this same clone (2 unpushed
frontend commits were present). To avoid capturing its in-progress work I staged
**only my backend files** (not `git add -A`): `llm.ts`,
`llm-integration-foundation.md`, `RESPONSE.md`, and the `REQUEST.md` deletion.

### Verification
- `pnpm --filter @product-tracer/worker typecheck` ✅
- No-key smoke test → `null`, no network ✅
- No API key read/committed; no out-of-scope files touched ✅
