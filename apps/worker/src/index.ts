import 'dotenv/config';

async function main() {
  console.log('[worker] product-tracer worker scaffolded');
  console.log('[worker] collectors will land here in week 1');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
