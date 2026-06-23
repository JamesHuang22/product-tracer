'use client';

/**
 * Client-side project bookmarks — localStorage only, no auth, no DB.
 *
 * Bookmarks are a set of project slugs persisted under one localStorage key.
 * A same-tab `CustomEvent` (the native `storage` event only fires in *other*
 * tabs) keeps every mounted button/list in sync the instant a toggle happens.
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'pt:bookmarks';
/** Fired on the window after any local mutation so same-tab listeners refresh. */
const BOOKMARKS_EVENT = 'pt:bookmarks-changed';

function read(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

function write(slugs: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    // Storage may be unavailable (private mode / quota) — fail silently.
  }
  window.dispatchEvent(new Event(BOOKMARKS_EVENT));
}

/** All bookmarked project slugs (most-recently-added last). */
export function getBookmarks(): string[] {
  return read();
}

/** Whether `slug` is currently bookmarked. */
export function isBookmarked(slug: string): boolean {
  return read().includes(slug);
}

/** Toggle `slug`'s bookmark state. Returns the new state (true = bookmarked). */
export function toggleBookmark(slug: string): boolean {
  const current = read();
  const exists = current.includes(slug);
  write(exists ? current.filter((s) => s !== slug) : [...current, slug]);
  return !exists;
}

/**
 * Subscribe a component to bookmark changes. `factory` is read once on mount
 * (after hydration, so SSR markup stays stable) and re-read on every same-tab
 * toggle and cross-tab `storage` event.
 */
function useBookmarkSubscription<T>(factory: () => T, initial: T): T {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    const refresh = () => setValue(factory());
    refresh();
    window.addEventListener(BOOKMARKS_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(BOOKMARKS_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
    // factory is recreated each render but always reads live storage — safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}

/** Reactive single-slug bookmark state + a toggle bound to that slug. */
export function useBookmark(slug: string): { bookmarked: boolean; toggle: () => void } {
  const bookmarked = useBookmarkSubscription(() => isBookmarked(slug), false);
  const toggle = useCallback(() => toggleBookmark(slug), [slug]);
  return { bookmarked, toggle };
}

/** Reactive list of all bookmarked slugs (for the /bookmarks page). */
export function useBookmarks(): string[] {
  return useBookmarkSubscription(read, []);
}
