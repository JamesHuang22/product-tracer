'use client';

import { useI18n } from '@/lib/i18n-context';
import type { Locale } from '@/lib/i18n';

const OPTIONS: { value: Locale; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'zh', label: '中文' },
];

/** Compact EN / 中文 segmented toggle for the site header. */
export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t('lang.label')}
      className="inline-flex items-center rounded-md border border-neutral-200 p-0.5 text-xs font-medium dark:border-neutral-800"
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === locale;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => setLocale(opt.value)}
            className={
              active
                ? 'rounded-[5px] bg-neutral-900 px-2 py-1 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'rounded-[5px] px-2 py-1 text-neutral-500 transition-colors hover:text-neutral-900 dark:hover:text-neutral-100'
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
