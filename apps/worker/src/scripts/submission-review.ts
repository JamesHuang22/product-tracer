/**
 * AI review of user-submitted products (TASK-013).
 *
 * Polls app.user_submission rows with review_status = 'pending', asks the LLM to
 * validate each (real URLs, plausible GitHub repo, genuine product description),
 * and either:
 *   - approves: creates an app.project (+ github identity_link), links it back,
 *     sets status='approved', review_status='valid'. The existing LLM-classify
 *     pipeline will categorize the new project on its next run.
 *   - flags: sets review_status='invalid' with reason/errors, keeps status
 *     'pending' so an admin can override.
 *
 * Run on a schedule (every ~5 min) or on demand — secrets live in GitHub Actions:
 *   gh workflow run "Submission Review" --repo JamesHuang22/product-tracer
 * Graceful no-op when LLM_API_KEY is unset.
 */
import { loadRepoEnv } from '../lib/load-env.js';
loadRepoEnv(import.meta.url);

import { z } from 'zod';
import { createSqlClient } from '@product-tracer/db';
import { callLlmJson, isLlmConfigured } from '../lib/llm.js';

const sql = createSqlClient();

const BATCH = 20;

interface PendingRow {
  id: string;
  product_name: string;
  description: string;
  product_url: string;
  github_url: string | null;
}

const ReviewResult = z.object({
  valid: z.boolean(),
  reasons: z.array(z.string()).default([]),
  errors: z.array(z.string()).default([]),
});

/** URL-safe slug from a product name, made unique with a short id suffix. */
function makeSlug(name: string, id: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `${base || 'submission'}-${id.slice(0, 6)}`;
}

/** owner/repo from a GitHub URL, for the identity_link external_id. */
function githubExternalId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/github\.com\/([^/\s]+\/[^/\s]+?)(?:\.git)?\/?$/i);
  return m ? m[1]! : null;
}

async function review(row: PendingRow): Promise<void> {
  const prompt = [
    'Validate this user-submitted product for a product-discovery directory.',
    `- Name: ${row.product_name}`,
    `- Description: ${row.description}`,
    `- Product URL: ${row.product_url}`,
    `- GitHub URL: ${row.github_url ?? '(none)'}`,
    '',
    'Checks:',
    '1. Is the product URL a plausible real web URL (not a placeholder like example.com, not empty)?',
    '2. If a GitHub URL is given, does it look like a real repo (https://github.com/owner/repo)?',
    '3. Does the description describe a genuine software product (not spam, gibberish, or a random thought)?',
    '',
    'Respond as JSON: {"valid": boolean, "reasons": string[], "errors": string[]}.',
    'errors = short strings naming each failed check; reasons = brief justification.',
  ].join('\n');

  const result = await callLlmJson(prompt, ReviewResult, {
    maxTokens: 400,
    systemPrompt: 'You are a strict but fair moderator validating product submissions.',
  });

  if (result === null) return; // unconfigured — leave pending

  if (!result.valid) {
    const reasons = result.reasons ?? [];
    const errors = result.errors ?? [];
    await sql`
      update app.user_submission
      set review_status = 'invalid',
          review_reason = ${reasons.join('; ') || 'Failed validation'},
          review_errors = ${sql.json(errors)},
          reviewed_at = now()
      where id = ${row.id}::uuid
    `;
    console.log(`[submission-review] ✗ ${row.id} invalid: ${errors.join(', ')}`);
    return;
  }

  // Approved → create the project, link github, and back-link the submission.
  const slug = makeSlug(row.product_name, row.id);
  const [project] = await sql<{ id: string }[]>`
    insert into app.project (slug, name, one_liner, primary_url, status)
    values (${slug}, ${row.product_name}, ${row.description.slice(0, 280)}, ${row.product_url}, 'active')
    on conflict (slug) do nothing
    returning id::text as id
  `;
  // Extremely unlikely slug collision (id-suffixed) — skip rather than crash.
  if (!project) {
    console.warn(`[submission-review] slug collision for ${row.id} (${slug}) — left pending.`);
    return;
  }

  const ghId = githubExternalId(row.github_url);
  if (ghId) {
    await sql`
      insert into app.identity_link (project_id, platform, external_id, confidence, source)
      values (${project.id}::uuid, 'github', ${ghId}, 1.0, 'manual')
      on conflict (platform, external_id) do nothing
    `;
  }

  await sql`
    update app.user_submission
    set status = 'approved', review_status = 'valid', reviewed_at = now(),
        project_id = ${project.id}::uuid
    where id = ${row.id}::uuid
  `;
  console.log(`[submission-review] ✓ ${row.id} approved → project ${slug}`);
}

async function main(): Promise<void> {
  if (!isLlmConfigured()) {
    console.warn('[submission-review] LLM_API_KEY not set — skipping.');
    return;
  }

  const rows = await sql<PendingRow[]>`
    select id::text as id, product_name, description, product_url, github_url
    from app.user_submission
    where review_status = 'pending'
    order by created_at asc
    limit ${BATCH}
  `;

  console.log(`[submission-review] ${rows.length} pending submission(s).`);
  for (const row of rows) {
    try {
      await review(row);
    } catch (err) {
      console.error(`[submission-review] error on ${row.id}:`, err);
    }
  }
  console.log('[submission-review] done.');
}

main()
  .catch((err) => {
    console.error('[submission-review] Unexpected error:', err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
