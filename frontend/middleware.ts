import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("access_token")?.value;

  const isPublicRoute =
    pathname === "/" || pathname.startsWith("/auth");

  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  if (token && pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all routes EXCEPT:
     * - _next/static, _next/image, favicon.ico (Next.js internals)
     * - /api/* (proxy routes to EC2 — must never be intercepted by middleware)
     */
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};