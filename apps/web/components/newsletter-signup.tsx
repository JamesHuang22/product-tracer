'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n-context';

type Status = 'idle' | 'loading' | 'success' | 'error';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Landing-page newsletter capture. Posts to /api/subscribe-newsletter and walks
 * through loading → success/error states. On success the form is replaced by a
 * confirmation so the visitor doesn't double-submit.
 */
export function NewsletterSignup() {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      const res = await fetch('/api/subscribe-newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized }),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-50 px-5 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
        <Check className="h-4 w-4" aria-hidden />
        {t('newsletter.success')}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === 'error') setStatus('idle');
          }}
          required
          placeholder={t('newsletter.placeholder')}
          aria-label={t('newsletter.placeholder')}
          aria-invalid={status === 'error'}
          className="w-full flex-1 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="shrink-0 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 disabled:opacity-60 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {status === 'loading' ? t('newsletter.subscribing') : t('newsletter.subscribe')}
        </button>
      </form>
      {status === 'error' && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{t('newsletter.error')}</p>
      )}
    </div>
  );
}
