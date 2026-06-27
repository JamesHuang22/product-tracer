'use client';

import { useActionState, useState } from 'react';
import { useI18n } from '@/lib/i18n-context';
import { authenticate, type AuthState } from './actions';

const initialState: AuthState = {};

/**
 * Combined sign-in / create-account form. A client `mode` toggle swaps the
 * copy and the hidden `mode` field; the single `authenticate` server action
 * branches on it. Errors / confirmation messages come back via useActionState.
 */
export function AuthForm() {
  const { t } = useI18n();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [state, formAction, pending] = useActionState(authenticate, initialState);

  const isSignUp = mode === 'signup';

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t(isSignUp ? 'auth.signUpTitle' : 'auth.signInTitle')}
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        {t(isSignUp ? 'auth.signUpSubtitle' : 'auth.signInSubtitle')}
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="mode" value={mode} />

        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium">
            {t('auth.email')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium">
            {t('auth.password')}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            required
            minLength={6}
            className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-neutral-100"
          />
        </div>

        {state.error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
            {state.error}
          </p>
        )}
        {state.message && (
          <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-60 dark:bg-neutral-50 dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {pending
            ? t('auth.submitting')
            : t(isSignUp ? 'auth.signUpButton' : 'auth.signInButton')}
        </button>
      </form>

      <button
        type="button"
        onClick={() => setMode(isSignUp ? 'signin' : 'signup')}
        className="mt-4 w-full text-center text-sm text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline dark:hover:text-neutral-100"
      >
        {t(isSignUp ? 'auth.toSignIn' : 'auth.toSignUp')}
      </button>
    </div>
  );
}
