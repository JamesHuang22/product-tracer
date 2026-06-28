import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { isLocale, LOCALE_COOKIE, type Locale } from '@/lib/i18n';

// Matches a leading `/en` or `/zh` prefix that is followed by `/` or the end of
// the path (so `/engineering` is NOT treated as the `en` locale). The locale is
// captured; the prefix itself is not consumed beyond the two-letter code.
const LOCALE_PREFIX = /^\/(en|zh)(?=\/|$)/;

/**
 * Serves locale-prefixed URLs (`/en/trends`, `/zh/bookmarks`, …) on top of the
 * cookie-based i18n system, without duplicating any page.
 *
 * The site has no `[locale]` route segment — locale is held in the `locale`
 * cookie and read by `app/layout.tsx` to drive `<html lang>`, the header, and
 * page content. So for a prefixed request we:
 *   1. rewrite to the un-prefixed path (which already exists), and
 *   2. set the `locale` cookie to the URL's locale on BOTH the forwarded
 *      request (so this render — header + body + html lang — is fully in that
 *      locale) and the response (so later un-prefixed navigation stays put).
 *
 * Un-prefixed paths fall through to the Supabase session refresh unchanged, so
 * `/trends` and friends keep working exactly as before (backward compatible).
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const match = pathname.match(LOCALE_PREFIX);

  if (match && isLocale(match[1])) {
    const locale: Locale = match[1];
    const url = request.nextUrl.clone();
    // Strip the `/en` | `/zh` prefix; bare `/en` → `/` (homepage).
    url.pathname = pathname.slice(match[0].length) || '/';

    // Make the forwarded request carry the URL's locale so the Server
    // Component tree (which reads the cookie) renders this locale regardless of
    // the visitor's previously stored choice.
    request.cookies.set(LOCALE_COOKIE, locale);
    const response = NextResponse.rewrite(url, {
      request: { headers: request.headers },
    });
    // Persist for subsequent (un-prefixed) navigations — 1 year, site-wide.
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: '/',
      maxAge: 31536000,
      sameSite: 'lax',
    });
    return response;
  }

  return updateSession(request);
}

export const config = {
  // Run on all routes except Next internals and static assets. Matches the
  // @supabase/ssr reference matcher.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|xml|txt)$).*)',
  ],
};
