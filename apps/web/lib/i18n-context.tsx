'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  translate,
  type Locale,
  type MessageKey,
} from './i18n';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Holds the active locale. Initialised from the server-resolved cookie value
 * (so first paint already matches the persisted choice) and updated purely
 * on the client when the user toggles — every consumer re-renders instantly.
 */
export function I18nProvider({
  initialLocale = DEFAULT_LOCALE,
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const router = useRouter();

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      if (typeof document !== 'undefined') {
        // Persist for future requests — 1 year, site-wide.
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        try {
          window.localStorage.setItem(LOCALE_COOKIE, next);
        } catch {
          // localStorage may be unavailable (private mode) — cookie is enough.
        }
      }
      // Client consumers re-render from the new `locale` state immediately, but
      // server-rendered strings (e.g. the /projects subtitle, which reads the
      // cookie in a Server Component) only update when the server re-runs.
      // Refresh so those update on toggle without a manual reload.
      router.refresh();
    },
    [router],
  );

  // First-visit language auto-detection. Runs once after mount (so it can't
  // cause an SSR/hydration mismatch — `navigator` is client-only): when the
  // visitor has never chosen a language (no cookie) and the browser prefers
  // Chinese, switch to zh and persist it. An explicit prior choice — any locale
  // cookie — is always respected.
  useEffect(() => {
    if (typeof navigator === 'undefined' || typeof document === 'undefined') return;
    const hasLocaleCookie = document.cookie
      .split('; ')
      .some((c) => c.startsWith(`${LOCALE_COOKIE}=`));
    if (
      !hasLocaleCookie &&
      locale === DEFAULT_LOCALE &&
      navigator.language.toLowerCase().startsWith('zh')
    ) {
      setLocale('zh');
    }
    // Mount-only: deliberately not reacting to later locale changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider');
  return ctx;
}
