'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, GitFork, Star } from 'lucide-react';
import type { ProjectListItem } from '@/lib/db';
import { fmtCount, cleanOneLiner } from '@/lib/format';
import { useI18n } from '@/lib/i18n-context';

const ch = createColumnHelper<ProjectListItem>();

// Short, colour-coded source chips for the platforms a project lives on.
const PLATFORM_BADGE: Record<string, { label: string; cls: string }> = {
  github: {
    label: 'GH',
    cls: 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900',
  },
  hacker_news: { label: 'HN', cls: 'bg-orange-500 text-white' },
  product_hunt: { label: 'PH', cls: 'bg-red-500 text-white' },
  youtube: { label: 'YT', cls: 'bg-red-600 text-white' },
  reddit: { label: 'R', cls: 'bg-orange-600 text-white' },
  x: { label: 'X', cls: 'bg-black text-white dark:bg-white dark:text-black' },
};

function PlatformBadges({ platforms }: { platforms: string[] }) {
  if (!platforms || platforms.length === 0) return <span className="text-neutral-400">—</span>;
  return (
    <span className="inline-flex gap-1">
      {platforms.map((p) => {
        const b = PLATFORM_BADGE[p] ?? {
          label: p.slice(0, 2).toUpperCase(),
          cls: 'bg-neutral-400 text-white',
        };
        return (
          <span
            key={p}
            className={`inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded px-1 text-[10px] font-bold ${b.cls}`}
            title={p}
          >
            {b.label}
          </span>
        );
      })}
    </span>
  );
}

/**
 * Where a row click goes. GitHub projects keep the original behaviour (open
 * their external URL in a new tab); everything else (HN / PH / Reddit) links
 * to its internal cross-platform detail page.
 */
function projectHref(p: ProjectListItem): { href: string; external: boolean } {
  const hasGithub = p.platforms?.includes('github');
  if (hasGithub && p.primary_url) return { href: p.primary_url, external: true };
  return { href: `/projects/${p.slug}`, external: false };
}

export function ProjectsTable({ projects }: { projects: ProjectListItem[] }) {
  const { t } = useI18n();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'github_stars', desc: true }]);
  const [filter, setFilter] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });

  const columns = useMemo(
    () => [
      ch.accessor('name', {
        header: t('table.header.project'),
        cell: (info) => {
          const p = info.row.original;
          const content = (
            <>
              <div className="truncate font-medium text-neutral-900 dark:text-neutral-50">
                {p.name}
              </div>
              {cleanOneLiner(p.one_liner) && (
                <div className="mt-0.5 line-clamp-1 text-sm text-neutral-500">
                  {cleanOneLiner(p.one_liner)}
                </div>
              )}
            </>
          );
          // The link is anchored here but its ::before pseudo-element stretches
          // across the whole row (the <tr> is position: relative). That makes
          // the entire row a click target while leaving cell text selectable.
          const { href, external } = projectHref(p);
          return external ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="block min-w-0 before:absolute before:inset-0"
            >
              {content}
            </a>
          ) : (
            <Link href={href as Route} className="block min-w-0 before:absolute before:inset-0">
              {content}
            </Link>
          );
        },
      }),
      ch.accessor('category', {
        header: t('table.header.category'),
        cell: (info) => {
          const v = info.getValue();
          return v ? (
            <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              {v}
            </span>
          ) : (
            <span className="text-neutral-400">—</span>
          );
        },
      }),
      ch.display({
        id: 'source',
        header: t('table.header.source'),
        cell: (info) => <PlatformBadges platforms={info.row.original.platforms ?? []} />,
      }),
      ch.accessor('github_stars', {
        header: t('table.header.stars'),
        cell: (info) => (
          <div className="text-right font-medium tabular-nums">{fmtCount(info.getValue())}</div>
        ),
        sortDescFirst: true,
      }),
      ch.accessor('github_forks', {
        header: t('table.header.forks'),
        cell: (info) => (
          <div className="text-right tabular-nums text-neutral-500">
            {fmtCount(info.getValue())}
          </div>
        ),
      }),
    ],
    [t],
  );

  const table = useReactTable({
    data: projects,
    columns,
    state: { sorting, globalFilter: filter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // Changing the search filter snaps back to page 1 (tanstack default).
    autoResetPageIndex: true,
  });

  // `rows` is the current page only; `filteredCount` is the full match count
  // (across all pages) that drives the count chip, empty state, and pager math.
  const rows = table.getRowModel().rows;
  const filteredCount = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const { pageIndex, pageSize } = table.getState().pagination;
  const rangeStart = filteredCount === 0 ? 0 : pageIndex * pageSize + 1;
  const rangeEnd = Math.min((pageIndex + 1) * pageSize, filteredCount);
  const numeric = (id: string) => id === 'github_stars' || id === 'github_forks';

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={t('table.search')}
          aria-label={t('table.search')}
          className="w-full max-w-sm rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
        />
        <div className="shrink-0 text-xs tabular-nums text-neutral-500">
          {t('table.count', { shown: filteredCount, total: projects.length })}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800 md:block">
        <table className="min-w-full">
          <thead className="bg-neutral-50/70 dark:bg-neutral-900/40">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-neutral-500 ${
                        numeric(header.column.id) ? 'text-right' : 'text-left'
                      }`}
                    >
                      {header.column.getCanSort() ? (
                        <button
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : sorted === 'desc' ? (
                            <ArrowDown className="h-3 w-3" />
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {rows.map((row) => (
              <tr
                key={row.id}
                className="relative cursor-pointer transition-colors hover:bg-neutral-50/60 dark:hover:bg-neutral-900/40"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={`px-4 py-3 ${numeric(cell.column.id) ? 'text-right' : ''}`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards — whole card is the link */}
      <div className="space-y-3 md:hidden">
        {rows.map((row) => {
          const p = row.original;
          const cardClass =
            'block rounded-lg border border-neutral-200 p-4 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600';
          const { href, external } = projectHref(p);
          const inner = (
            <>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{p.name}</span>
                  <PlatformBadges platforms={p.platforms ?? []} />
                </div>
                {cleanOneLiner(p.one_liner) && (
                  <div className="mt-1 line-clamp-2 text-sm text-neutral-500">
                    {cleanOneLiner(p.one_liner)}
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs">
                {p.category && (
                  <span className="rounded-md bg-neutral-100 px-2 py-0.5 font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    {p.category}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 tabular-nums text-neutral-600 dark:text-neutral-400">
                  <Star className="h-3 w-3" /> {fmtCount(p.github_stars)}
                </span>
                <span className="inline-flex items-center gap-1 tabular-nums text-neutral-500">
                  <GitFork className="h-3 w-3" /> {fmtCount(p.github_forks)}
                </span>
              </div>
            </>
          );
          return external ? (
            <a key={row.id} href={href} target="_blank" rel="noreferrer" className={cardClass}>
              {inner}
            </a>
          ) : (
            <Link key={row.id} href={href as Route} className={cardClass}>
              {inner}
            </Link>
          );
        })}
      </div>

      {filteredCount === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
          {filter ? t('table.noMatch', { query: filter }) : t('table.empty')}
        </div>
      )}

      {/* Pagination — applies to both the desktop table and the mobile cards,
          since both render `rows` (the current page only). */}
      {filteredCount > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span className="tabular-nums">
              {t('table.pagination.showing', {
                start: rangeStart,
                end: rangeEnd,
                total: filteredCount,
              })}
            </span>
            <select
              value={pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              aria-label={t('table.pagination.perPage', { count: pageSize })}
              className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
            >
              {[10, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {t('table.pagination.perPage', { count: n })}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="rounded-md border border-neutral-300 px-2.5 py-1 font-medium transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-900"
            >
              {t('table.pagination.prev')}
            </button>
            <span className="tabular-nums text-neutral-500">
              {t('table.pagination.page', { current: pageIndex + 1, total: pageCount })}
            </span>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="rounded-md border border-neutral-300 px-2.5 py-1 font-medium transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-neutral-700 dark:hover:bg-neutral-900"
            >
              {t('table.pagination.next')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
