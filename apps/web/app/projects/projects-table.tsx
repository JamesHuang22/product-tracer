'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { Route } from 'next';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type PaginationState,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronUp, GitFork, Star, X } from 'lucide-react';
import type { ProjectListItem } from '@/lib/db';
import { LLM_CATEGORIES, formatCategory } from '@/lib/categories';
import { fmtCount, cleanOneLiner, localizedText } from '@/lib/format';
import { useI18n } from '@/lib/i18n-context';
import type { MessageKey } from '@/lib/i18n';
import { CategoryBadge } from '@/components/category-badge';
import { BookmarkButton } from '@/components/bookmark-button';
import { TagChips } from '@/components/tag-chips';

const ch = createColumnHelper<ProjectListItem>();

/** Compare-selection handlers passed through tanstack table `meta` (TASK-020). */
type CompareMeta = {
  isSelected: (id: string) => boolean;
  toggleSelected: (id: string) => void;
  selectionFull: boolean;
  compareLabel: string;
  compareMaxTitle: string;
};

/** Trim to `max` characters (unicode-safe), appending an ellipsis when cut. */
function truncateChars(s: string, max: number): string {
  const chars = [...s];
  return chars.length > max ? chars.slice(0, max).join('').trimEnd() + '…' : s;
}

/**
 * Heat accent for a project card/row — a coloured left border keyed on GitHub
 * stars (our available quality proxy; app.project has no quality_score column).
 * Lower tiers keep a transparent 4px border so text alignment stays identical
 * across every row regardless of tier.
 */
function heatBorderClass(stars: number | null | undefined): string {
  if (stars != null && stars >= 1000) return 'border-l-4 border-l-emerald-500';
  if (stars != null && stars >= 100) return 'border-l-4 border-l-amber-500';
  return 'border-l-4 border-l-transparent';
}

/** Sort dropdown options → the tanstack sorting state each one applies. */
const SORT_OPTIONS: { value: string; key: MessageKey; sorting: SortingState }[] = [
  { value: 'stars-desc', key: 'sort.starsDesc', sorting: [{ id: 'github_stars', desc: true }] },
  { value: 'stars-asc', key: 'sort.starsAsc', sorting: [{ id: 'github_stars', desc: false }] },
  { value: 'votes-desc', key: 'sort.mostUpvoted', sorting: [{ id: 'net_votes', desc: true }] },
  { value: 'newest', key: 'sort.newest', sorting: [{ id: 'created_at', desc: true }] },
  { value: 'name-asc', key: 'sort.nameAsc', sorting: [{ id: 'name', desc: false }] },
];

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
 * Where a row click goes. Every project links to its internal cross-platform
 * detail page (which carries a "Visit site" button out to the original URL).
 * Routing internally — rather than sending GitHub rows straight to github.com —
 * means the list always exposes real project links to crawlers and keyboard
 * users, and keeps navigation consistent across platforms.
 */
function projectHref(p: ProjectListItem): { href: string; external: boolean } {
  return { href: `/projects/${p.slug}`, external: false };
}

export function ProjectsTable({ projects }: { projects: ProjectListItem[] }) {
  const { t, locale } = useI18n();
  // `?tag=` (set by clicking a tag chip) narrows the table to projects carrying
  // that tag. Applied before the data reaches tanstack so the count, empty
  // state, and pager all reflect the tag-filtered set.
  const searchParams = useSearchParams();
  const activeTag = searchParams.get('tag');
  const [sorting, setSorting] = useState<SortingState>([{ id: 'github_stars', desc: true }]);
  const [sortValue, setSortValue] = useState('stars-desc');
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState('');

  // Full-text search across name + description + AI summary + tags (TASK-019).
  // Applied here (not via tanstack's column-only global filter) so it reaches
  // the one_liner/ai_summary fields, which aren't table columns. The category
  // dropdown remains a tanstack column filter, so the two combine.
  const query = filter.trim().toLowerCase();
  const data = useMemo(() => {
    let rows = activeTag ? projects.filter((p) => p.tags.includes(activeTag)) : projects;
    if (query) {
      rows = rows.filter((p) =>
        [p.name, p.one_liner, p.ai_summary, ...(p.tags ?? [])]
          .filter(Boolean)
          .some((field) => (field as string).toLowerCase().includes(query)),
      );
    }
    return rows;
  }, [projects, activeTag, query]);

  const onSortChange = (value: string) => {
    setSortValue(value);
    const opt = SORT_OPTIONS.find((o) => o.value === value);
    if (opt) setSorting(opt.sorting);
  };
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 50 });

  // Compare selection (TASK-020): up to 3 project ids, persisted in component
  // state across pagination/sort. The "Compare (N)" bar links to /compare.
  const [selected, setSelected] = useState<string[]>([]);
  const MAX_COMPARE = 3;
  const isSelected = (id: string) => selected.includes(id);
  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE) return prev; // cap at 3
      return [...prev, id];
    });
  };
  const compareHref = `/compare?ids=${selected.join(',')}`;

  // Category dropdown drives an exact-match column filter on `llm_category`.
  // Empty string = "All". Going through tanstack's filter pipeline means the
  // count chip, empty state, and pager all stay in sync, and autoResetPageIndex
  // snaps back to page 1 on change.
  const columnFilters = useMemo<ColumnFiltersState>(
    () => (category ? [{ id: 'llm_category', value: category }] : []),
    [category],
  );

  const columns = useMemo(
    () => [
      ch.accessor('name', {
        header: t('table.header.project'),
        cell: (info) => {
          const p = info.row.original;
          const oneLiner = localizedText(locale, cleanOneLiner(p.one_liner));
          const aiSummary = localizedText(locale, p.ai_summary);
          const content = (
            <>
              <div className="truncate font-medium text-neutral-900 dark:text-neutral-50">
                {p.name}
              </div>
              {oneLiner && (
                <div className="mt-0.5 line-clamp-1 text-sm text-neutral-500">{oneLiner}</div>
              )}
              {aiSummary && (
                <div
                  title={aiSummary}
                  className="mt-0.5 line-clamp-1 text-xs italic text-neutral-400"
                >
                  <span aria-hidden>✨ </span>
                  {truncateChars(aiSummary, 80)}
                </div>
              )}
            </>
          );
          // The link is anchored here but its ::before pseudo-element stretches
          // across the whole row (the <tr> is position: relative). That makes
          // the entire row a click target while leaving cell text selectable.
          // Tag chips sit outside the anchor (raised above the row overlay) so
          // they stay independently clickable.
          const { href } = projectHref(p);
          return (
            <>
              <Link href={href as Route} className="block min-w-0 before:absolute before:inset-0">
                {content}
              </Link>
              {p.tags.length > 0 && <TagChips tags={p.tags} max={4} className="mt-1.5" />}
            </>
          );
        },
      }),
      ch.accessor('llm_category', {
        header: t('table.header.category'),
        cell: (info) => {
          const v = info.getValue();
          return v ? (
            <CategoryBadge category={v} />
          ) : (
            <span className="text-neutral-400">—</span>
          );
        },
        enableSorting: false,
        filterFn: 'equalsString',
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
      ch.accessor((p) => (p.upvotes ?? 0) - (p.downvotes ?? 0), {
        id: 'net_votes',
        header: t('table.header.votes'),
        cell: (info) => {
          const v = info.getValue();
          return (
            <div
              className={`text-right font-medium tabular-nums ${
                v > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : v < 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-neutral-400'
              }`}
            >
              {v > 0 ? `+${fmtCount(v)}` : fmtCount(v)}
            </div>
          );
        },
        sortDescFirst: true,
      }),
      // Hidden column — exists only so the "Newest first" sort option has a
      // created_at accessor to order by (ISO strings sort chronologically).
      ch.accessor('created_at', {
        header: '',
        sortDescFirst: true,
      }),
      // Bookmark toggle. The button raises itself above the row's full-bleed
      // link overlay (relative z-10) and stops click propagation, so saving a
      // project never navigates to it.
      ch.display({
        id: 'bookmark',
        header: '',
        cell: (info) => (
          <div className="flex justify-end">
            <BookmarkButton slug={info.row.original.slug} />
          </div>
        ),
      }),
      // Compare checkbox. Reads selection state from table meta (kept current
      // each render) and raises itself above the row link overlay.
      ch.display({
        id: 'compare',
        header: '',
        cell: (info) => {
          const id = info.row.original.id;
          const meta = info.table.options.meta as CompareMeta;
          const checked = meta.isSelected(id);
          const disabled = !checked && meta.selectionFull;
          return (
            <div className="flex justify-center">
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => meta.toggleSelected(id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={meta.compareLabel}
                title={disabled ? meta.compareMaxTitle : meta.compareLabel}
                className="relative z-10 h-4 w-4 cursor-pointer accent-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
              />
            </div>
          );
        },
      }),
    ],
    [t, locale],
  );

  const table = useReactTable({
    data,
    columns,
    initialState: { columnVisibility: { created_at: false } },
    state: { sorting, columnFilters, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    // Changing the search filter snaps back to page 1 (tanstack default).
    autoResetPageIndex: true,
    meta: {
      isSelected,
      toggleSelected,
      selectionFull: selected.length >= MAX_COMPARE,
      compareLabel: t('compare.select'),
      compareMaxTitle: t('compare.max'),
    } satisfies CompareMeta,
  });

  // `rows` is the current page only; `filteredCount` is the full match count
  // (across all pages) that drives the count chip, empty state, and pager math.
  const rows = table.getRowModel().rows;
  const filteredCount = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const { pageIndex, pageSize } = table.getState().pagination;
  const rangeStart = filteredCount === 0 ? 0 : pageIndex * pageSize + 1;
  const rangeEnd = Math.min((pageIndex + 1) * pageSize, filteredCount);
  const numeric = (id: string) =>
    id === 'github_stars' || id === 'github_forks' || id === 'net_votes';

  // "Go to page" input. Held as free text while typing, kept in sync with the
  // real page index (so Prev/Next, page-size changes, and filter resets all
  // reflect here), and committed on Enter/blur with a silent clamp to [1, N].
  const [pageInput, setPageInput] = useState(String(pageIndex + 1));
  useEffect(() => {
    setPageInput(String(pageIndex + 1));
  }, [pageIndex]);

  const commitPageInput = () => {
    const parsed = Number.parseInt(pageInput, 10);
    if (Number.isNaN(parsed)) {
      setPageInput(String(pageIndex + 1));
      return;
    }
    const clamped = Math.min(Math.max(parsed, 1), Math.max(pageCount, 1));
    table.setPageIndex(clamped - 1);
    setPageInput(String(clamped));
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t('table.search')}
            aria-label={t('table.search')}
            className="w-full max-w-sm rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label={t('table.filter.category')}
            className="shrink-0 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">{t('table.filter.allCategories')}</option>
            {LLM_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {formatCategory(c)}
              </option>
            ))}
          </select>
          <select
            value={sortValue}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label={t('sort.label')}
            className="shrink-0 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.key)}
              </option>
            ))}
          </select>
        </div>
        <div className="shrink-0 text-xs tabular-nums text-neutral-500">
          {t('table.count', { shown: filteredCount, total: data.length })}
        </div>
      </div>

      {query && (
        <div className="mb-4 text-sm text-neutral-500">
          {t('table.resultsFound', { count: filteredCount })}
        </div>
      )}

      {selected.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-50/60 px-4 py-2.5 dark:border-emerald-500/20 dark:bg-emerald-500/5">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            {t('compare.selected', { count: selected.length, max: MAX_COMPARE })}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected([])}
              className="rounded-md px-2.5 py-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              {t('compare.clear')}
            </button>
            {selected.length >= 2 ? (
              <Link
                href={compareHref as Route}
                className="rounded-md bg-emerald-600 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                {t('compare.cta', { count: selected.length })}
              </Link>
            ) : (
              <span
                className="cursor-not-allowed rounded-md bg-neutral-200 px-3.5 py-1.5 text-sm font-medium text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
                title={t('compare.needTwo')}
              >
                {t('compare.cta', { count: selected.length })}
              </span>
            )}
          </div>
        </div>
      )}

      {activeTag && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <span className="text-neutral-500">{t('table.filteredByTag')}</span>
          <Link
            href="/projects"
            className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            #{activeTag}
            <X className="h-3 w-3" aria-hidden />
          </Link>
        </div>
      )}

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
                {row.getVisibleCells().map((cell, idx) => (
                  <td
                    key={cell.id}
                    className={`px-4 py-3 ${numeric(cell.column.id) ? 'text-right' : ''} ${
                      idx === 0 ? heatBorderClass(row.original.github_stars) : ''
                    }`}
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
          const cardClass = `relative rounded-lg border border-neutral-200 p-4 pr-12 transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-600 ${heatBorderClass(
            p.github_stars,
          )}`;
          const { href } = projectHref(p);
          const oneLiner = localizedText(locale, cleanOneLiner(p.one_liner));
          const aiSummary = localizedText(locale, p.ai_summary);
          // Overlay pattern: the link's `::before` spans the whole card, so the
          // tag chips and bookmark button can be interactive siblings raised
          // above it (`relative z-10`) without nesting links inside the anchor.
          return (
            <div key={row.id} className={cardClass}>
              <Link href={href as Route} className="block min-w-0 before:absolute before:inset-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{p.name}</span>
                  <PlatformBadges platforms={p.platforms ?? []} />
                </div>
                {oneLiner && (
                  <div className="mt-1 line-clamp-2 text-sm text-neutral-500">{oneLiner}</div>
                )}
                {aiSummary && (
                  <div className="mt-1 line-clamp-2 text-xs italic text-neutral-400">
                    <span aria-hidden>✨ </span>
                    {aiSummary}
                  </div>
                )}
              </Link>
              <div className="mt-3 flex items-center gap-4 text-xs">
                {p.llm_category && <CategoryBadge category={p.llm_category} />}
                <span className="inline-flex items-center gap-1 tabular-nums text-neutral-600 dark:text-neutral-400">
                  <Star className="h-3 w-3" /> {fmtCount(p.github_stars)}
                </span>
                <span className="inline-flex items-center gap-1 tabular-nums text-neutral-500">
                  <GitFork className="h-3 w-3" /> {fmtCount(p.github_forks)}
                </span>
                {(() => {
                  const v = (p.upvotes ?? 0) - (p.downvotes ?? 0);
                  if (v === 0) return null;
                  return (
                    <span
                      className={`inline-flex items-center gap-1 tabular-nums ${
                        v > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      <ChevronUp className="h-3 w-3" /> {v > 0 ? `+${fmtCount(v)}` : fmtCount(v)}
                    </span>
                  );
                })()}
              </div>
              {p.tags.length > 0 && <TagChips tags={p.tags} max={5} className="mt-2" />}
              <div className="absolute right-3 top-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isSelected(p.id)}
                  disabled={!isSelected(p.id) && selected.length >= MAX_COMPARE}
                  onChange={() => toggleSelected(p.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={t('compare.select')}
                  className="relative z-10 h-4 w-4 cursor-pointer accent-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                />
                <BookmarkButton slug={p.slug} />
              </div>
            </div>
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
            <span className="flex items-center gap-1 tabular-nums text-neutral-500">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={pageCount}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                onBlur={commitPageInput}
                aria-label={t('table.pagination.page', {
                  current: pageIndex + 1,
                  total: pageCount,
                })}
                className="w-12 rounded-md border border-neutral-300 bg-white px-1.5 py-1 text-center text-xs tabular-nums focus:border-neutral-500 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900"
              />
              <span aria-hidden>/</span>
              <span>{pageCount}</span>
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
