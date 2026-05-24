import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import dotenv from 'dotenv';

// Load .env from the monorepo root. Next.js otherwise only looks under apps/web,
// but the project stores secrets at the repo root so all workspaces share them.
const here = path.dirname(fileURLToPath(import.meta.url));
let dir = here;
while (dir !== path.dirname(dir)) {
  if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
    dotenv.config({ path: path.join(dir, '.env') });
    break;
  }
  dir = path.dirname(dir);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@product-tracer/types', '@product-tracer/db'],
  typedRoutes: true,
};

export default nextConfig;
