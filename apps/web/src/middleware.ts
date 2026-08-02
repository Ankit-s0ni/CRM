import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_LANGUAGES = new Set(["en", "ar"]);
const APP_DOMAIN =
  process.env.NEXT_PUBLIC_APP_DOMAIN?.trim().toLowerCase() ?? "";

function isPlatformRoute(pathname: string) {
  return pathname === "/platform" || pathname.startsWith("/platform/");
}

function canonicalizePlatformHost(request: NextRequest) {
  if (!APP_DOMAIN) return null;

  const hostname = request.nextUrl.hostname.toLowerCase();
  const isTenantHost =
    hostname !== APP_DOMAIN && hostname.endsWith(`.${APP_DOMAIN}`);

  if (!isTenantHost) return null;

  const destination = request.nextUrl.clone();
  destination.hostname = APP_DOMAIN;
  destination.port = "";
  return NextResponse.redirect(destination);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPlatformRoute(pathname)) {
    return canonicalizePlatformHost(request) ?? NextResponse.next();
  }

  const firstSegment = pathname.split("/")[1];
  if (PUBLIC_LANGUAGES.has(firstSegment)) return NextResponse.next();
  if (pathname !== "/app" && !pathname.startsWith("/app/")) {
    return NextResponse.next();
  }

  const savedLanguage =
    request.cookies.get("deltcrm-language")?.value ??
    request.cookies.get("deltcrm-locale")?.value;
  const language = savedLanguage?.startsWith("ar") ? "ar" : "en";
  const destination = request.nextUrl.clone();
  destination.pathname = `/${language}${pathname}`;
  return NextResponse.redirect(destination);
}

export const config = {
  matcher: ["/app", "/app/:path*", "/platform", "/platform/:path*"],
};
