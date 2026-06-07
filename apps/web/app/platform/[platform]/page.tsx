import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getPlatformProjects } from '@/lib/db';
import { ProjectsTable } from '@/app/projects/projects-table';
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, translate, type MessageKey } from '@/lib/i18n';

// Live data — reflect the latest collector run on every request.
export const dynamic = 'force-dynamic';

const PLATFORMS = ['github', 'hacker_news', 'product_hunt', 'youtube', 'reddit', 'x'] as const;
type Platform = (typeof PLATFORMS)[number];

function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}

function platformNameKey(platform: Platform): MessageKey {
  return `platform.name.${platform}` as MessageKey;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ platform: string }>;
}): Promise<Metadata> {
  const { platform } = await params;
  if (!isPlatform(platform)) return { title: 'Platform not found — Product Tracer' };
  const name = translate('en', platformNameKey(platform));
  return { title: `${name} projects — Product Tracer` };
}

export default async function PlatformPage({ params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  if (!isPlatform(platform)) notFound();

  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;

  const projects = await getPlatformProjects(platform);
  const name = translate(locale, platformNameKey(platform));
  const subtitle =
    projects.length === 1
      ? translate(locale, 'platform.page.oneProject', { platform: name })
      : translate(locale, 'platform.page.subtitle', { count: projects.length, platform: name });

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
        <p className="mt-2 text-sm text-neutral-500">{subtitle}</p>
      </header>
      <ProjectsTable projects={projects} />
    </main>
  );
}
