import { z } from 'zod';

/**
 * Reusable LLM client for the worker — **plumbing only, no features**.
 *
 * Speaks the OpenAI-compatible Chat Completions API (`POST /chat/completions`),
 * which DeepSeek, OpenRouter, and OpenAI all implement. That means one tiny
 * fetch-based client works for every provider; swapping providers is purely a
 * matter of env vars — no SDK, no code change.
 *
 * Configuration (env / GitHub secrets — never hard-code a key):
 *   LLM_API_KEY   — provider API key. **Absent → every call is a graceful no-op
 *                   that returns null** (same pattern as the collectors'
 *                   isAuthConfigured()). Nothing here calls the network at import.
 *   LLM_MODEL     — model id (default 'deepseek-chat').
 *   LLM_BASE_URL  — provider base URL (default 'https://api.deepseek.com').
 *
 * Default provider rationale (see research-docs/llm-integration-foundation.md):
 * DeepSeek `deepseek-chat` — cheapest viable option ($0.14/$0.28 per 1M
 * in/out tokens), strong bilingual EN+ZH, OpenAI-compatible incl. JSON mode.
 *
 * Public surface:
 *   isLlmConfigured()                  — is a key present?
 *   callLlm(prompt, options?)          — raw completion → LlmResponse | null
 *   callLlmJson(prompt, schema, opts?) — JSON mode + zod-validated parse → T | null
 *
 * Both calls return null (not throw) when unconfigured, so callers can degrade
 * gracefully. Transient failures (429 / 5xx / network / timeout) are retried up
 * to 3× with exponential backoff; client errors (e.g. 401) fail fast.
 */

const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-chat';
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.2;
const MAX_ATTEMPTS = 3;

export interface LlmOptions {
  /** Override LLM_MODEL for this call. */
  model?: string;
  /** Optional system prompt prepended to the conversation. */
  systemPrompt?: string;
  /** 0–2; lower = more deterministic. Default 0.2. */
  temperature?: number;
  /** Max completion tokens. Default 1024. */
  maxTokens?: number;
  /** Per-attempt timeout. Default 60s. */
  timeoutMs?: number;
  /** Request an OpenAI-compatible JSON-object response. */
  json?: boolean;
  /** Caller-supplied cancellation; abort here propagates (no retry). */
  signal?: AbortSignal;
}

export interface LlmUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LlmResponse {
  content: string;
  model: string;
  usage: LlmUsage | null;
}

/** True when an LLM API key is configured. Mirrors the collectors' auth checks. */
export function isLlmConfigured(): boolean {
  return Boolean(process.env.LLM_API_KEY);
}

function baseUrl(): string {
  return (process.env.LLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function configuredModel(): string {
  return process.env.LLM_MODEL || DEFAULT_MODEL;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Minimal OpenAI-compatible chat-completion response shape. */
const ChatCompletion = z.object({
  model: z.string().optional(),
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().nullable().default('') }),
      }),
    )
    .min(1),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .optional(),
});

/**
 * Single chat completion. Returns null when LLM_API_KEY is unset (graceful skip).
 * Retries transient failures (429/5xx/network/timeout) up to MAX_ATTEMPTS with
 * exponential backoff; throws on non-retriable errors or once retries run out.
 */
export async function callLlm(prompt: string, options: LlmOptions = {}): Promise<LlmResponse | null> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    console.warn('[llm] LLM_API_KEY not set — skipping call, returning null.');
    return null;
  }

  const model = options.model ?? configuredModel();
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (options.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? DEFAULT_TEMPERATURE,
    max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
  };
  if (options.json) body.response_format = { type: 'json_object' };

  const url = `${baseUrl()}/chat/completions`;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    if (options.signal) {
      if (options.signal.aborted) controller.abort();
      else options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    let retriable = false;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (res.ok) {
        const json = ChatCompletion.parse(await res.json());
        const usage = json.usage
          ? {
              promptTokens: json.usage.prompt_tokens ?? 0,
              completionTokens: json.usage.completion_tokens ?? 0,
              totalTokens: json.usage.total_tokens ?? 0,
            }
          : null;
        return { content: json.choices[0]?.message.content ?? '', model: json.model ?? model, usage };
      }

      // HTTP error: retry only on rate-limit / server errors.
      retriable = res.status === 429 || res.status >= 500;
      const errBody = (await res.text()).slice(0, 300);
      lastErr = new Error(`[llm] ${res.status} ${res.statusText}: ${errBody}`);
    } catch (err) {
      // A caller-initiated abort propagates immediately (not our timeout).
      if (options.signal?.aborted) throw err;
      // Network error / our timeout / unparseable body → transient, retry.
      lastErr = err;
      retriable = true;
    } finally {
      clearTimeout(timeout);
    }

    if (!retriable || attempt === MAX_ATTEMPTS) {
      throw lastErr instanceof Error ? lastErr : new Error(`[llm] request failed: ${String(lastErr)}`);
    }
    const backoff = 500 * 2 ** (attempt - 1) + Math.floor(Math.random() * 250);
    console.warn(`[llm] attempt ${attempt}/${MAX_ATTEMPTS} failed, retrying in ${backoff}ms`);
    await sleep(backoff);
  }

  // Unreachable (loop either returns or throws), but satisfies the type checker.
  throw lastErr instanceof Error ? lastErr : new Error('[llm] exhausted retries');
}

const JSON_SYSTEM_INSTRUCTION =
  'Respond ONLY with a single valid JSON object. No prose, no explanation, no markdown code fences.';

/**
 * Like callLlm but requests JSON mode, parses the response, and validates it
 * against `schema`. Returns null when unconfigured. Throws if the model returns
 * content that isn't valid JSON or doesn't satisfy the schema.
 */
export async function callLlmJson<T>(
  prompt: string,
  schema: z.ZodType<T>,
  options: LlmOptions = {},
): Promise<T | null> {
  const systemPrompt = options.systemPrompt
    ? `${options.systemPrompt}\n\n${JSON_SYSTEM_INSTRUCTION}`
    : JSON_SYSTEM_INSTRUCTION;

  const res = await callLlm(prompt, { ...options, json: true, systemPrompt });
  if (res === null) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(res.content);
  } catch {
    // Some providers still wrap JSON in ```fences``` even in JSON mode — strip them.
    const stripped = res.content
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();
    raw = JSON.parse(stripped); // a genuine parse failure surfaces as a clear error
  }
  return schema.parse(raw);
}
