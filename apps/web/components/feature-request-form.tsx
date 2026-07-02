'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n-context';

const inputCls =
  'w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:focus:border-neutral-300';
const labelCls = 'mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300';

/**
 * Feature-request form (TASK-033). Mirrors SubmitForm: client-side validation
 * (title 5–100, description 10–5000), POST to /api/feature-request, success
 * state. Rendered only for signed-in users (the page auth-gates).
 */
export function FeatureRequestForm() {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const valid =
    title.trim().length >= 5 &&
    title.trim().length <= 100 &&
    description.trim().length >= 10 &&
    description.trim().length <= 5000;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!valid) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/feature-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() }),
      });
      const data = (await res.json()) as { success: boolean; error?: string };
      if (!res.ok || !data.success) {
        setError(data.error ?? 'submit_failed');
        return;
      }
      setDone(true);
    } catch {
      setError('Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setTitle('');
    setDescription('');
    setError(null);
    setDone(false);
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-6 text-center dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <h2 className="mt-3 text-lg font-semibold tracking-tight">{t('feature.successTitle')}</h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-neutral-600 dark:text-neutral-400">
          {t('feature.successBody')}
        </p>
        <div className="mt-5 flex items-center justify-center gap-4 text-sm">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline dark:text-emerald-300"
          >
            {t('feature.backToDashboard')}
          </Link>
          <button
            type="button"
            onClick={reset}
            className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            {t('feature.another')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="fr-title" className={labelCls}>
          {t('feature.title')}
        </label>
        <input
          id="fr-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          placeholder={t('feature.titlePlaceholder')}
          className={inputCls}
          required
        />
      </div>

      <div>
        <label htmlFor="fr-desc" className={labelCls}>
          {t('feature.description')}
        </label>
        <textarea
          id="fr-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={5000}
          rows={6}
          className={`${inputCls} resize-y`}
          required
        />
        <p className="mt-1 text-xs tabular-nums text-neutral-400">
          {t('feature.descHint', { n: description.trim().length })}
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!valid || submitting}
        className="inline-flex items-center justify-center gap-2 rounded-md bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        {submitting ? t('feature.submitting') : t('feature.button')}
        {!submitting && <ArrowRight className="h-3.5 w-3.5" aria-hidden />}
      </button>
    </form>
  );
}
