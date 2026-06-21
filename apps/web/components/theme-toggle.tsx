'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useI18n } from '@/lib/i18n-context';

/**
 * Light/dark toggle for the site header. The actual class on <html> is applied
 * pre-paint by the inline script in `layout.tsx` (from localStorage or the
 * system preference); this button just reflects and flips that state, persisting
 * an explicit choice to `localStorage.theme`.
 *
 * Renders nothing until mounted so the icon is read from the real DOM state
 * rather than guessed during SSR (which would risk a hydration mismatch).
 */
export function ThemeToggle() {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light');
    } catch {
      // localStorage may be unavailable (private mode) — the class still applies.
    }
  };

  const label = t(isDark ? 'theme.toLight' : 'theme.toDark');

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 transition-colors hover:text-neutral-900 dark:border-neutral-800 dark:hover:text-neutral-100"
    >
      {/* Until mounted, render a placeholder of the same size to avoid layout
          shift; the icon resolves once we know the real theme. */}
      {mounted ? (
        isDark ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )
      ) : (
        <span className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
