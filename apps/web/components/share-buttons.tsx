'use client';

import { useState } from 'react';
import { Check, Link2, Share2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n-context';

/**
 * Social share controls for a project detail page. Twitter/X and LinkedIn open
 * the platform's intent URL (built from the current page URL at click time, so
 * it works regardless of host/preview domain). Copy Link writes the URL to the
 * clipboard and flips to a "Copied!" state for a couple of seconds.
 */
export function ShareButtons({ title }: { title: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  function currentUrl(): string {
    if (typeof window === 'undefined') return '';
    return window.location.href;
  }

  function shareTwitter() {
    const url = currentUrl();
    const text = `${title} — OpenProduct`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  function shareLinkedIn() {
    const url = currentUrl();
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(currentUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (insecure context / denied) — no-op.
    }
  }

  const btn =
    'inline-flex items-center gap-2 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-900';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500">
        <Share2 className="h-4 w-4" aria-hidden />
        {t('share.label')}
      </span>
      <button type="button" onClick={shareTwitter} className={btn}>
        {t('share.twitter')}
      </button>
      <button type="button" onClick={shareLinkedIn} className={btn}>
        {t('share.linkedin')}
      </button>
      <button
        type="button"
        onClick={copyLink}
        aria-live="polite"
        className={`${btn} ${copied ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300' : ''}`}
      >
        {copied ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
        {copied ? t('share.copied') : t('share.copy')}
      </button>
    </div>
  );
}
