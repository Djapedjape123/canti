import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_FORBIDDEN_PATH, ADMIN_HOME_PATH, ADMIN_LOGIN_PATH, isOwnerEmail } from "@/lib/admin-access";
import { adminText } from "@/lib/admin-text";
import { defaultLocale, hasLocale } from "@/lib/i18n";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";

export async function proxy(request: NextRequest): Promise<NextResponse | undefined> {
  const { pathname } = request.nextUrl;
  if (isUnder(pathname, "/admin") || isUnder(pathname, "/api/admin")) {
    return protectAdmin(request);
  }
  return redirectToLocale(request);
}

export const config = {
  matcher: [
    // Public pages: everything except API routes, the admin panel, Next.js internals and files with an extension.
    "/((?!api|admin|_next|.*\\..*).*)",
    // Admin panel and admin API: only the owner gets through.
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};

/** "/admin" and "/admin/…", but not "/administrator". */
function isUnder(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

// Every public page lives under /sr or /en.
// A path without a language (/, /apartmani/de-lux) is redirected to Serbian.
function redirectToLocale(request: NextRequest): NextResponse | undefined {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split("/")[1] ?? "";
  if (hasLocale(firstSegment)) return undefined;

  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

/**
 * /admin and /api/admin: refreshes the Supabase session cookies and lets only
 * the owner through. Pages and API routes check again (lib/admin-auth.ts).
 */
async function protectAdmin(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // A refreshed session goes to this request (for the page that renders now)
        // and to the response (for the browser), together with its no-cache headers.
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // Nothing may run between creating the client and getUser(): it refreshes the session.
  // getUser() asks Supabase Auth, so a forged or expired cookie is not enough.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = user !== null && isOwnerEmail(user.email, process.env.OWNER_EMAIL);
  if (user && !isAdmin) {
    console.warn("[admin] A logged-in account was refused: its email is not OWNER_EMAIL");
  }

  const { pathname } = request.nextUrl;

  if (isUnder(pathname, "/api/admin")) {
    if (isAdmin) return response;
    const body = { error: user ? adminText.api.forbidden : adminText.api.notLoggedIn };
    return withSession(response, NextResponse.json(body, { status: user ? 403 : 401 }));
  }

  if (pathname === ADMIN_LOGIN_PATH) {
    // Only the owner skips the login form. Anyone else must be able to see it,
    // otherwise a wrong OWNER_EMAIL would bounce between two pages forever.
    if (!isAdmin) return response;
    return withSession(response, NextResponse.redirect(new URL(ADMIN_HOME_PATH, request.url)));
  }

  if (isAdmin) return response;
  const target = user ? ADMIN_FORBIDDEN_PATH : ADMIN_LOGIN_PATH;
  return withSession(response, NextResponse.redirect(new URL(target, request.url)));
}

/** Carries refreshed session cookies and their no-cache headers over to a redirect or an error. */
function withSession(from: NextResponse, to: NextResponse): NextResponse {
  for (const cookie of from.cookies.getAll()) to.cookies.set(cookie);
  for (const header of ["cache-control", "expires", "pragma"]) {
    const value = from.headers.get(header);
    if (value) to.headers.set(header, value);
  }
  return to;
}
