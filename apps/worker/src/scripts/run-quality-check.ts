/**
 * Data Quality pipeline — score every project and demote the noise.
 *
 * Runs after all collectors have populated `app.project` / `raw.snapshot`.
 * For each project it gathers the project's snapshots (engagement) and
 * identity links (cross-platform presence), scores it with the rule-based
 * `assessProject()` classifier (no external AI, zero cost), then:
 *
 *   - score <  threshold  → mark `status='noise'` (was 'active')
 *   - score >= threshold  → restore `status='active'` (was 'noise')
 *
 * `status='dead'` projects are left untouched. A summary report is written to
 * `raw.collector_error` (platform='quality') for observability.
 *
 * Run from repo root: pnpm --filter @product-tracer/worker quality:check
 * Production cron: .github/workflows/data-quality.yml daily at UTC 06:00.
 */
import { loadRepoEnv } from '../lib/load-env.js';
loadRepoEnv(import.meta.url);

import { createSqlClient } from '@product-tracer/db';
import {
  assessProject,
  KEEP_THRESHOLD,
  type AssessIdentityLink,
  type AssessSnapshot,
} from '../quality/classifier.js';

const sql = createSqlClient();

interface ProjectRow {
  id: string;
  name: string;
  one_liner: string | null;
  category: string | null;
  status: string;
}

async function main(): Promise<void> {
  const projects = await sql<ProjectRow[]>`
    select id, name, one_liner, category, status from app.project
  `;
  console.log(`→ Assessing ${projects.length} projects…`);

  if (projects.length === 0) {
    console.log('No projects to assess.');
    return;
  }

  // Pull all snapshots and identity links once, then group in memory — avoids
  // an N+1 query storm across what can be thousands of projects.
  const snapshotRows = await sql<({ project_id: string } & AssessSnapshot)[]>`
    select project_id, platform, upvotes, comments, stars, forks
    from raw.snapshot
    where project_id is not null
  `;
  const linkRows = await sql<({ project_id: string } & AssessIdentityLink)[]>`
    select project_id, platform from app.identity_link
  `;

  const snapshotsByProject = new Map<string, AssessSnapshot[]>();
  for (const row of snapshotRows) {
    const list = snapshotsByProject.get(row.project_id) ?? [];
    list.push(row);
    snapshotsByProject.set(row.project_id, list);
  }
  const linksByProject = new Map<string, AssessIdentityLink[]>();
  for (const row of linkRows) {
    const list = linksByProject.get(row.project_id) ?? [];
    list.push(row);
    linksByProject.set(row.project_id, list);
  }

  let kept = 0;
  let noise = 0;
  let markedNoise = 0;
  let restored = 0;
  let scoreSum = 0;
  const worst: { name: string; score: number; reason: string }[] = [];

  for (const project of projects) {
    const result = assessProject(
      project,
      snapshotsByProject.get(project.id) ?? [],
      linksByProject.get(project.id) ?? [],
    );
    scoreSum += result.score;

    if (result.should_keep) {
      kept++;
      // Recover anything we previously demoted that now clears the bar.
      if (project.status === 'noise') {
        await sql`update app.project set status = 'active' where id = ${project.id}`;
        restored++;
      }
    } else {
      noise++;
      worst.push({ name: project.name, score: result.score, reason: result.reason });
      // Only demote active projects — never override a 'dead' marker.
      if (project.status === 'active') {
        await sql`update app.project set status = 'noise' where id = ${project.id}`;
        markedNoise++;
      }
    }
  }

  worst.sort((a, b) => a.score - b.score);
  const avg = Math.round(scoreSum / projects.length);
  const summary = {
    total: projects.length,
    kept,
    noise,
    noise_pct: Math.round((noise / projects.length) * 100),
    newly_marked_noise: markedNoise,
    restored_to_active: restored,
    avg_score: avg,
    threshold: KEEP_THRESHOLD,
    worst_examples: worst.slice(0, 15),
  };

  await sql`
    insert into raw.collector_error (platform, error_type, payload)
    values ('quality', 'quality_report', ${sql.json(summary)})
  `;

  console.log(
    `✓ Quality check done: ${kept} kept, ${noise} noise (${summary.noise_pct}%), ` +
      `avg score ${avg}. Newly demoted ${markedNoise}, restored ${restored}.`,
  );
}

main()
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
