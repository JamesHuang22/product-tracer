/**
 * Collect top-ranked Product Hunt launches and store them in Supabase.
 *
 * Unlike the HN collector, PH posts carry no GitHub URL field, so there is no
 * hard cross-platform match step — every post becomes (or refreshes) a
 * PH-only project record:
 *   - Upsert app.project (by slug)
 *   - Write app.identity_link (platform='product_hunt') + raw.snapshot +
 *     app.project_metric.ph_upvotes
 *
 * Run from repo root: pnpm collect:producthunt
 * Production cron: .github/workflows/collect-producthunt.yml every 4h
 * (offset 1h from GH (:00) and HN (:30) so the runners don't compete).
 */
import { loadRepoEnv } from '../lib/load-env.js';
loadRepoEnv(import.meta.url);

import { createSqlClient } from '@product-tracer/db';
import {
  fetchFeaturedProducts,
  isNoiseProduct,
  productSlug,
  type PHProduct,
} from '../collectors/producthunt.js';

const sql = createSqlClient();

async function storeProduct(product: PHProduct): Promise<void> {
  const slug = productSlug(product);
  const category = product.topics[0] ?? null;
  // PH gives us both the product's own site (website) and its PH page (url).
  // Prefer the real product site as the canonical primary_url.
  const primaryUrl = product.website || product.url;
  const today = new Date().toISOString().slice(0, 10);

  const [row] = await sql<{ id: string }[]>`
    insert into app.project (slug, name, one_liner, category, primary_url, status)
    values (${slug}, ${product.name}, ${product.tagline || null}, ${category}, ${primaryUrl}, 'active')
    on conflict (slug) do update set
      name        = excluded.name,
      one_liner   = coalesce(app.project.one_liner, excluded.one_liner),
      category    = coalesce(excluded.category, app.project.category),
      primary_url = coalesce(excluded.primary_url, app.project.primary_url)
    returning id
  `;
  const projectId = row!.id;

  // Hard identity link — this PH post IS this project, by PH id.
  await sql`
    insert into app.identity_link (project_id, platform, external_id, confidence, source)
    values (${projectId}, 'product_hunt', ${String(product.id)}, 1.0, 'hard')
    on conflict (platform, external_id) do nothing
  `;

  await sql`
    insert into raw.snapshot (project_id, platform, upvotes, comments, raw_data)
    values (${projectId}, 'product_hunt', ${product.votesCount}, ${product.commentsCount}, ${sql.json(product)})
  `;

  // ph_upvotes per day — latest run wins. Other metric columns on the same row
  // are untouched because the upsert only assigns the listed column.
  await sql`
    insert into app.project_metric (project_id, date, ph_upvotes)
    values (${projectId}, ${today}, ${product.votesCount})
    on conflict (project_id, date) do update set ph_upvotes = excluded.ph_upvotes
  `;
}

async function main(): Promise<void> {
  console.log('→ Fetching Product Hunt featured posts…');
  const products = await fetchFeaturedProducts(20);
  console.log(`  ${products.length} posts`);

  const filtered = products.filter((p) => !isNoiseProduct(p));
  console.log(`  ${filtered.length} after noise filter (-${products.length - filtered.length})`);

  let stored = 0;
  let failed = 0;
  for (const product of filtered) {
    try {
      await storeProduct(product);
      stored++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ PH ${product.id} (${product.name}): ${message}`);
      await sql`
        insert into raw.collector_error (platform, error_type, payload)
        values ('product_hunt', 'store_product_failed', ${sql.json({ id: product.id, name: product.name, message })})
      `;
    }
  }

  console.log(`✓ Stored ${stored} Product Hunt posts (${failed} failed).`);
}

main()
  .catch((err) => {
    console.error('Unexpected error:', err);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
