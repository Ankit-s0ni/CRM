import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PUBLIC_LANGUAGES = new Set(["en", "ar"]);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
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
  matcher: ["/app", "/app/:path*"],
};
