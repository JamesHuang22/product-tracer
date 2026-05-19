/**
 * Sanity-check that .env is set up correctly and the Supabase service-role key works.
 *
 * Run from repo root: pnpm test:db
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import dotenv from 'dotenv';
import { createServiceClient } from '@product-tracer/db';

// Resolve repo root by walking up to pnpm-workspace.yaml, then load .env from there.
function findRepoRoot(startDir: string): string {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error('Could not find repo root (no pnpm-workspace.yaml found)');
}
const repoRoot = findRepoRoot(path.dirname(fileURLToPath(import.meta.url)));
dotenv.config({ path: path.join(repoRoot, '.env') });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    console.error('✗ NEXT_PUBLIC_SUPABASE_URL is not set in .env');
    process.exit(1);
  }
  console.log(`→ Connecting to ${url}`);

  const supabase = createServiceClient();

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) {
    console.error('✗ Supabase service-role connection failed:');
    console.error(`  ${error.message}`);
    process.exit(1);
  }

  console.log('✓ Service-role key works');
  console.log(`  auth.users count (page 1): ${data.users.length}`);

  console.log('');
  console.log('Checking schemas + key tables:');

  const checks: Array<[string, string]> = [
    ['app', 'project'],
    ['app', 'signal'],
    ['app', 'subscriber'],
    ['raw', 'snapshot'],
  ];

  let allOk = true;
  for (const [schema, table] of checks) {
    const { count, error: e } = await supabase
      .schema(schema)
      .from(table)
      .select('*', { count: 'exact', head: true });
    if (e) {
      console.log(`  ✗ ${schema}.${table}: ${e.message}`);
      allOk = false;
    } else {
      console.log(`  ✓ ${schema}.${table}: ${count ?? 0} rows`);
    }
  }

  console.log('');
  if (allOk) {
    console.log('All checks passed. Ready for the next PR (GitHub collector).');
  } else {
    console.log('Some checks failed. Likely causes:');
    console.log('  1. migration 0001 not yet applied (see packages/db/README.md)');
    console.log('  2. "app" and/or "raw" not yet in Supabase Project Settings → API → Exposed schemas');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
