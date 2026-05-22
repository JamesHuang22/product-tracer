import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import dotenv from 'dotenv';

/**
 * Load `.env` from the repo root. The worker runs with cwd inside apps/worker,
 * so `dotenv/config` alone would miss the root .env — walk up to find it.
 */
export function loadRepoEnv(importMetaUrl: string): void {
  let dir = path.dirname(fileURLToPath(importMetaUrl));
  while (dir !== path.dirname(dir)) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      dotenv.config({ path: path.join(dir, '.env') });
      return;
    }
    dir = path.dirname(dir);
  }
  throw new Error('Could not find repo root (no pnpm-workspace.yaml found)');
}
