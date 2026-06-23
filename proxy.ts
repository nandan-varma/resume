import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PROTECTED = ["/jobs", "/settings", "/editor"];
const AUTH_ONLY = ["/login", "/signup", "/forgot-password", "/reset-password"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSessionCookie(request);

  const isProtected = PROTECTED.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );
  const isAuthOnly = AUTH_ONLY.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );

  if (isProtected && !session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthOnly && session) {
    return NextResponse.redirect(new URL("/jobs", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/jobs/:path*",
    "/settings/:path*",
    "/editor/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ],
};
