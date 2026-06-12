import { getSessionCookie } from "better-auth/cookies";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED = ["/dashboard", "/jobs", "/analyze", "/settings", "/resume"];
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
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/jobs/:path*",
    "/analyze/:path*",
    "/settings/:path*",
    "/resume/:path*",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
  ],
};
