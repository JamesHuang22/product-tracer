'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useI18n } from '@/lib/i18n-context';
import { fmtCount } from '@/lib/format';

type VoteValue = -1 | 0 | 1;

/**
 * Up/down vote control for a single project. Self-contained: holds optimistic
 * counts, POSTs to /api/vote, and reverts on failure. Anonymous users get a
 * 401 from the API, which surfaces an inline "Sign in to vote" prompt linking
 * to /login (mirrors the TASK-014 anonymous submit flow).
 */
export function VoteButton({
  projectId,
  initialUpvotes,
  initialDownvotes,
  initialUserVote = 0,
}: {
  projectId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  initialUserVote?: VoteValue;
}) {
  const { t } = useI18n();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<VoteValue>(initialUserVote);
  const [pending, setPending] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  async function cast(vote: 1 | -1) {
    if (pending) return;
    setShowSignIn(false);

    // Optimistic: derive the next tallies locally before the round-trip.
    const prev = { upvotes, downvotes, userVote };
    const nextVote: VoteValue = userVote === vote ? 0 : vote;
    let nextUp = upvotes;
    let nextDown = downvotes;
    if (userVote === 1) nextUp -= 1;
    if (userVote === -1) nextDown -= 1;
    if (nextVote === 1) nextUp += 1;
    if (nextVote === -1) nextDown += 1;

    setUpvotes(nextUp);
    setDownvotes(nextDown);
    setUserVote(nextVote);
    setPending(true);

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, vote }),
      });
      if (res.status === 401) {
        setUpvotes(prev.upvotes);
        setDownvotes(prev.downvotes);
        setUserVote(prev.userVote);
        setShowSignIn(true);
        return;
      }
      if (!res.ok) throw new Error(`vote failed: ${res.status}`);
      const data = (await res.json()) as { upvotes: number; downvotes: number; userVote: VoteValue };
      setUpvotes(data.upvotes);
      setDownvotes(data.downvotes);
      setUserVote(data.userVote);
    } catch {
      setUpvotes(prev.upvotes);
      setDownvotes(prev.downvotes);
      setUserVote(prev.userVote);
    } finally {
      setPending(false);
    }
  }

  const net = upvotes - downvotes;

  return (
    <div className="relative inline-flex flex-col items-stretch">
      <div className="inline-flex items-center overflow-hidden rounded-lg border border-neutral-300 dark:border-neutral-700">
        <button
          type="button"
          onClick={() => cast(1)}
          aria-pressed={userVote === 1}
          aria-label={t('vote.upvote')}
          title={t('vote.upvote')}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium tabular-nums transition-colors ${
            userVote === 1
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
              : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-900'
          }`}
        >
          <ChevronUp className="h-4 w-4" aria-hidden />
          {fmtCount(upvotes)}
        </button>
        <span
          className="min-w-[2.5rem] border-x border-neutral-200 px-2 py-1.5 text-center text-sm font-semibold tabular-nums text-neutral-900 dark:border-neutral-800 dark:text-neutral-100"
          title={t('vote.score')}
        >
          {net > 0 ? `+${fmtCount(net)}` : fmtCount(net)}
        </span>
        <button
          type="button"
          onClick={() => cast(-1)}
          aria-pressed={userVote === -1}
          aria-label={t('vote.downvote')}
          title={t('vote.downvote')}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium tabular-nums transition-colors ${
            userVote === -1
              ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
              : 'text-neutral-600 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-900'
          }`}
        >
          <ChevronDown className="h-4 w-4" aria-hidden />
          {fmtCount(downvotes)}
        </button>
      </div>
      {showSignIn && (
        <div className="absolute left-0 top-full z-20 mt-1.5 whitespace-nowrap rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs shadow-md dark:border-neutral-700 dark:bg-neutral-900">
          <Link href="/login" className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
            {t('vote.signInPrompt')}
          </Link>
        </div>
      )}
    </div>
  );
}
