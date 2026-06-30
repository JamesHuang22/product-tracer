/**
 * LLM-only relevance judgement for YouTube videos (TASK-028-REV).
 *
 * Single source of truth, used by both the ingestion gate (youtube-insights)
 * and the audit/cleanup script. NO hardcoded keyword lists — keyword allow/deny
 * lists can't enumerate all non-tech content, so every video is judged solely by
 * the model with a strict bilingual prompt.
 *
 * Returns:
 *   true  — relevant to developers / startups / AI / tech (keep)
 *   false — not relevant (food vlogs, lifestyle, daily chat, …) (drop)
 *   null  — could not decide (LLM unset / failed / ambiguous) → callers KEEP,
 *           so an outage never deletes or drops content.
 */
import { callLlm } from './llm.js';

export async function isVideoRelevant(
  title: string,
  summary: string,
): Promise<boolean | null> {
  const prompt = [
    'This video is for a tech/indie-dev product discovery platform.',
    'Is this video relevant to developers, startups, AI, or tech products?',
    'Only answer "yes" or "no".',
    '',
    `Title: ${title}`,
    `Summary: ${summary}`,
    '',
    '如果视频内容与独立开发、技术、AI、创业无关，回答 "no"。',
    '只回答 yes 或 no。',
  ].join('\n');

  const res = await callLlm(prompt, { temperature: 0, maxTokens: 8 });
  if (!res) return null; // LLM unavailable — undecided

  const answer = res.content.trim().toLowerCase();
  if (answer.startsWith('no') || answer.includes('否') || answer.startsWith('不')) return false;
  if (answer.startsWith('yes') || answer.includes('是') || answer.includes('相关')) return true;
  return null; // unrecognized reply — undecided (keep)
}
