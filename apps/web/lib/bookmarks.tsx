'use client';

/**
 * Project bookmarks — dual-mode, auth-aware.
 *
 * - **Guest** (not signed in): bookmarks live in localStorage under one key, as
 *   before. A same-tab CustomEvent + cross-tab `storage` event keep every
 *   mounted button/list in sync.
 * - **Signed in**: bookmarks live in `app.bookmark` (per user). Toggles hit the
 *   API optimistically; on first load any guest localStorage bookmarks are
 *   merged into the account and then cleared locally.
 *
 * Both modes are exposed through one context so `useBookmark` / `useBookmarks`
 * have identical signatures regardless of auth state — callers don't care.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const STORAGE_KEY = 'pt:bookmarks';
/** Fired on the window after any local mutation so same-tab listeners refresh. */
const BOOKMARKS_EVENT = 'pt:bookmarks-changed';

function readLocal(): string[] {
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

function writeLocal(slugs: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  } catch {
    // Storage unavailable (private mode / quota) — fail silently.
  }
  window.dispatchEvent(new Event(BOOKMARKS_EVENT));
}

function clearLocal(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

interface BookmarksContextValue {
  /** All bookmarked slugs (most-recently-added first). */
  slugs: string[];
  /** True once the initial load (localStorage read or API fetch) has settled. */
  loaded: boolean;
  /** Whether the active user is signed in (DB-backed) vs. a guest. */
  authed: boolean;
  isBookmarked: (slug: string) => boolean;
  toggle: (slug: string) => void;
}

const BookmarksContext = createContext<BookmarksContextValue | null>(null);

export function BookmarksProvider({
  initialUserId,
  children,
}: {
  initialUserId: string | null;
  children: React.ReactNode;
}) {
  const authed = Boolean(initialUserId);
  const [slugs, setSlugs] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Initial load + keep-in-sync. Re-runs if the auth state flips.
  useEffect(() => {
    let cancelled = false;

    if (!authed) {
      const refresh = () => setSlugs(readLocal());
      refresh();
      setLoaded(true);
      window.addEventListener(BOOKMARKS_EVENT, refresh);
      window.addEventListener('storage', refresh);
      return () => {
        cancelled = true;
        window.removeEventListener(BOOKMARKS_EVENT, refresh);
        window.removeEventListener('storage', refresh);
      };
    }

    // Signed in: merge any guest bookmarks once, then load the DB set.
    const load = async () => {
      const local = readLocal();
      try {
        if (local.length > 0) {
          const res = await fetch('/api/bookmarks/merge', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ slugs: local }),
          });
          if (res.ok) {
            const d = await res.json();
            clearLocal();
            if (!cancelled) setSlugs(Array.isArray(d.slugs) ? d.slugs : []);
            return;
          }
        }
        const res = await fetch('/api/bookmarks/ids');
        const d = await res.json();
        if (!cancelled) setSlugs(Array.isArray(d.slugs) ? d.slugs : []);
      } catch {
        // Network error — leave the set empty; the user can retry by toggling.
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [authed]);

  const toggle = useCallback(
    (slug: string) => {
      if (!authed) {
        const cur = readLocal();
        writeLocal(cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug]);
        return;
      }
      // Optimistic: flip locally, then reconcile with the server's truth.
      setSlugs((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [slug, ...prev]));
      fetch('/api/bookmarks/toggle', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
        .then((r) => {
          if (!r.ok) throw new Error('toggle failed');
          return r.json();
        })
        .then((d: { bookmarked: boolean }) => {
          setSlugs((prev) => {
            const has = prev.includes(slug);
            if (d.bookmarked && !has) return [slug, ...prev];
            if (!d.bookmarked && has) return prev.filter((s) => s !== slug);
            return prev;
          });
        })
        .catch(() => {
          // Revert the optimistic flip.
          setSlugs((prev) =>
            prev.includes(slug) ? prev.filter((s) => s !== slug) : [slug, ...prev],
          );
        });
    },
    [authed],
  );

  const isBookmarked = useCallback((slug: string) => slugs.includes(slug), [slugs]);

  const value = useMemo<BookmarksContextValue>(
    () => ({ slugs, loaded, authed, isBookmarked, toggle }),
    [slugs, loaded, authed, isBookmarked, toggle],
  );

  return <BookmarksContext.Provider value={value}>{children}</BookmarksContext.Provider>;
}

function useBookmarksContext(): BookmarksContextValue {
  const ctx = useContext(BookmarksContext);
  if (!ctx) {
    throw new Error('useBookmark(s) must be used within a <BookmarksProvider>');
  }
  return ctx;
}

/** Reactive single-slug bookmark state + a toggle bound to that slug. */
export function useBookmark(slug: string): { bookmarked: boolean; toggle: () => void } {
  const { isBookmarked, toggle } = useBookmarksContext();
  const boundToggle = useCallback(() => toggle(slug), [toggle, slug]);
  return { bookmarked: isBookmarked(slug), toggle: boundToggle };
}

/** Reactive list of all bookmarked slugs (for the /bookmarks page). */
export function useBookmarks(): string[] {
  return useBookmarksContext().slugs;
}

/** Load/auth metadata for UIs that need to avoid flashing an empty state. */
export function useBookmarksMeta(): { loaded: boolean; authed: boolean } {
  const { loaded, authed } = useBookmarksContext();
  return { loaded, authed };
}
