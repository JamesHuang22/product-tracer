export function fmtCount(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n.toLocaleString();
}
