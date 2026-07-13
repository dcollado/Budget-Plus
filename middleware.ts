import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth-session";

const PUBLIC_ROUTES = ["/login", "/api/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const hasValidSession = await verifySessionToken(token);

  if (pathname === "/login" && hasValidSession) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isPublicRoute) {
    return NextResponse.next();
  }

  if (!hasValidSession) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "No autorizado." },
        { status: 401 }
      );
    }

    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
