'use client';

import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, GitFork, Star } from 'lucide-react';
import type { ProjectListItem } from '@/lib/db';
import { fmtCount } from '@/lib/format';

const ch = createColumnHelper<ProjectListItem>();

export function ProjectsTable({ projects }: { projects: ProjectListItem[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'github_stars', desc: true }]);
  const [filter, setFilter] = useState('');

  const columns = useMemo(
    () => [
      ch.accessor('name', {
        header: 'Project',
        cell: (info) => {
          const p = info.row.original;
          const content = (
            <>
              <div className="truncate font-medium text-neutral-900 dark:text-neutral-50">
                {p.name}
              </div>
              {p.one_liner && (
                <div className="mt-0.5 line-clamp-1 text-sm text-neutral-500">{p.one_liner}</div>
              )}
            </>
          );
          // The link is anchored here but its ::before pseudo-element stretches
          // across the whole row (the <tr> is position: relative). That makes
          // the entire row a click target while leaving cell text selectable.
          return p.primary_url ? (
            <a
              href={p.primary_url}
              target="_blank"
              rel="noreferrer"
              className="block min-w-0 before:absolute before:inset-0"
            >
              {content}
            </a>
          ) : (
            <div className="min-w-0">{content}</div>
          );
        },
      }),
      ch.accessor('category', {
        header: 'Category',
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
      ch.accessor('github_stars', {
        header: 'Stars',
        cell: (info) => (
          <div className="text-right font-medium tabular-nums">{fmtCount(info.getValue())}</div>
        ),
        sortDescFirst: true,
      }),
      ch.accessor('github_forks', {
        header: 'Forks',
        cell: (info) => (
          <div className="text-right tabular-nums text-neutral-500">
            {fmtCount(info.getValue())}
          </div>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: projects,
    columns,
    state: { sorting, globalFilter: filter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const rows = table.getRowModel().rows;
  const numeric = (id: string) => id === 'github_stars' || id === 'github_forks';

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search projects…"
          className="w-full max-w-sm rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
        />
        <div className="text-xs tabular-nums text-neutral-500">
          {rows.length} of {projects.length}
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
            'block rounded-lg border border-neutral-200 p-4 transition-colors dark:border-neutral-800';
          const interactiveClass = p.primary_url
            ? ' hover:border-neutral-400 dark:hover:border-neutral-600'
            : '';
          const inner = (
            <>
              <div className="min-w-0">
                <div className="truncate font-medium">{p.name}</div>
                {p.one_liner && (
                  <div className="mt-1 line-clamp-2 text-sm text-neutral-500">{p.one_liner}</div>
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
          return p.primary_url ? (
            <a
              key={row.id}
              href={p.primary_url}
              target="_blank"
              rel="noreferrer"
              className={cardClass + interactiveClass}
            >
              {inner}
            </a>
          ) : (
            <div key={row.id} className={cardClass}>
              {inner}
            </div>
          );
        })}
      </div>

      {rows.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
          No projects match &ldquo;{filter}&rdquo;.
        </div>
      )}
    </div>
  );
}
