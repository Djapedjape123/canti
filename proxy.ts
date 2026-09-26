import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, hasLocale } from "@/lib/i18n";

// Every public page lives under /sr or /en.
// A path without a language (/, /apartmani/de-lux) is redirected to Serbian.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split("/")[1] ?? "";

  if (hasLocale(firstSegment)) return;

  const url = request.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip API routes, the (future) admin panel, Next.js internals and any file with an extension.
  matcher: ["/((?!api|admin|_next|.*\\..*).*)"],
};
