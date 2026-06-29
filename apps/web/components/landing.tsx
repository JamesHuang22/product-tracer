'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { ArrowRight, Sparkles, RefreshCw, Compass } from 'lucide-react';
import { useI18n } from '@/lib/i18n-context';
import { Reveal } from '@/components/reveal';

const GITHUB_REPO = 'https://github.com/JamesHuang22/product-tracer';

/** Round down to a clean "N+" figure (e.g. 4,512 → "4,500+"); small counts show as-is. */
function approxCount(n: number): string {
  if (n < 100) return n.toLocaleString();
  const step = n < 1000 ? 100 : 500;
  return `${(Math.floor(n / step) * step).toLocaleString()}+`;
}

export function Landing({
  authed,
  productCount,
  summaryCount,
}: {
  authed: boolean;
  productCount: number;
  summaryCount: number;
}) {
  const { t } = useI18n();
  const ctaHref: Route = authed ? '/dashboard' : '/login';
  const ctaLabel = authed ? t('landing.ctaDashboard') : t('landing.cta');

  const features = [
    { icon: Sparkles, title: t('landing.feature1.title'), body: t('landing.feature1.body') },
    { icon: RefreshCw, title: t('landing.feature2.title'), body: t('landing.feature2.body') },
    { icon: Compass, title: t('landing.feature3.title'), body: t('landing.feature3.body') },
  ];

  const stats = [
    { value: approxCount(productCount), label: t('landing.stats.products') },
    { value: approxCount(summaryCount), label: t('landing.stats.summaries') },
    { value: '⚡', label: t('landing.stats.cadence') },
  ];

  return (
    <main className="relative">
      {/* ---- Hero ---- */}
      <section className="relative isolate overflow-hidden">
        {/* Animated gradient mesh: large blurred blobs that drift + hue-shift. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="lp-mesh absolute -left-1/4 -top-1/3 h-[60vh] w-[60vh] rounded-full bg-emerald-400/30 blur-3xl dark:bg-emerald-500/20" />
          <div
            className="lp-mesh absolute -right-1/4 top-0 h-[55vh] w-[55vh] rounded-full bg-teal-300/30 blur-3xl dark:bg-teal-500/20"
            style={{ animationDelay: '-6s' }}
          />
          <div
            className="lp-mesh absolute bottom-[-20%] left-1/3 h-[50vh] w-[50vh] rounded-full bg-violet-300/25 blur-3xl dark:bg-violet-500/15"
            style={{ animationDelay: '-12s' }}
          />
          {/* Floating dots for depth. */}
          {[
            'left-[12%] top-[28%]',
            'left-[82%] top-[36%]',
            'left-[68%] top-[18%]',
            'left-[24%] top-[64%]',
            'left-[48%] top-[22%]',
          ].map((pos, i) => (
            <span
              key={pos}
              className={`lp-float absolute ${pos} size-1.5 rounded-full bg-emerald-500/50`}
              style={{ animationDelay: `${i * -1.4}s` }}
            />
          ))}
        </div>

        <div className="mx-auto flex max-w-4xl flex-col items-center px-6 py-28 text-center sm:py-36">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <span className="inline-block size-1.5 rounded-full bg-emerald-500" aria-hidden />
              {t('landing.eyebrow')}
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-6 bg-gradient-to-br from-neutral-900 via-neutral-800 to-emerald-700 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-7xl dark:from-white dark:via-neutral-200 dark:to-emerald-300">
              OpenProduct
            </h1>
          </Reveal>

          <Reveal delay={140}>
            <p className="mt-4 text-2xl font-semibold tracking-tight text-neutral-800 sm:text-3xl dark:text-neutral-100">
              {t('landing.tagline')}
            </p>
          </Reveal>

          <Reveal delay={200}>
            <p className="mx-auto mt-4 max-w-xl text-base text-neutral-600 sm:text-lg dark:text-neutral-400">
              {t('landing.subtitle')}
            </p>
          </Reveal>

          <Reveal delay={260}>
            <Link
              href={ctaHref}
              data-cta="landing-get-started"
              className="group mt-9 inline-flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/10 transition-all hover:bg-emerald-600 hover:shadow-emerald-500/30 dark:bg-white dark:text-neutral-900 dark:hover:bg-emerald-400"
            >
              {ctaLabel}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ---- Features ---- */}
      <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
        <Reveal>
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            {t('landing.featuresHeading')}
          </h2>
        </Reveal>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 100}>
              <div className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-white p-6 transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <f.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                  {f.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---- Stats strip ---- */}
      <section className="border-y border-neutral-200/70 bg-neutral-50/60 dark:border-neutral-800/70 dark:bg-neutral-900/40">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 px-6 py-12 text-center sm:grid-cols-3">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 100}>
              <div>
                <div className="text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 sm:text-4xl">
                  {s.value}
                </div>
                <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-col items-center justify-between gap-4 border-t border-neutral-200/70 pt-8 text-sm sm:flex-row dark:border-neutral-800/70">
          <div className="flex items-center gap-2 text-neutral-500">
            <span className="inline-block size-2 rounded-full bg-emerald-500" aria-hidden />
            <span className="font-medium text-neutral-700 dark:text-neutral-300">OpenProduct</span>
            <span>© 2026</span>
          </div>
          <nav className="flex items-center gap-5 text-neutral-500">
            <Link href="/dashboard" className="transition-colors hover:text-neutral-900 dark:hover:text-neutral-100">
              {t('landing.footer.dashboard')}
            </Link>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-neutral-900 dark:hover:text-neutral-100"
            >
              GitHub
            </a>
          </nav>
        </div>
      </footer>
    </main>
  );
}
