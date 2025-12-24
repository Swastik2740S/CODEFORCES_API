import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read auth cookie (HTTP-only cookie is accessible here)
  const token = request.cookies.get("access_token")?.value;

  // Public routes
  const publicRoutes = ["/auth"];

  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  /**
   * CASE 1:
   * Not authenticated → trying to access protected route
   */
  if (!token && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  /**
   * CASE 2:
   * Authenticated → trying to access auth page
   */
  if (token && isPublicRoute) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  /**
   * CASE 3:
   * Allow request
   */
  return NextResponse.next();
}

/**
 * Apply proxy to all routes except static assets
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
