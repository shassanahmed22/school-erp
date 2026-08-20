import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const ACCESS_TOKEN_COOKIE = "erp_access_token";

const PUBLIC_ROUTES = ["/login", "/forgot-password", "/reset-password"];
const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/refresh",
];

const FORCED_CHANGE_PASSWORD_ROUTE = "/change-password-required";

interface DecodedAuth {
  mustChangePassword?: boolean;
}

async function decodeToken(token: string | undefined): Promise<DecodedAuth | null> {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(
      process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me"
    );
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as DecodedAuth;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public API endpoints and static assets straight through
  if (
    PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const decoded = await decodeToken(token);
  const authenticated = !!decoded;

  const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));

  // Protect all API routes except explicitly public ones
  if (pathname.startsWith("/api/")) {
    if (!authenticated) {
      return NextResponse.json(
        { success: false, message: "Unauthorized - please log in" },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // Redirect unauthenticated users away from protected pages
  if (!isPublicRoute && !authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (isPublicRoute && authenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // A user flagged for a forced password change (e.g. an admin-created
  // account on its first login) can only reach that one page and API/auth
  // routes until they change it — everything else in the dashboard redirects
  // there instead. This is enforced here (not just client-side) so it can't
  // be bypassed by clicking a sidebar link or typing a URL directly.
  if (authenticated && decoded?.mustChangePassword && pathname !== FORCED_CHANGE_PASSWORD_ROUTE) {
    return NextResponse.redirect(new URL(FORCED_CHANGE_PASSWORD_ROUTE, request.url));
  }
  if (authenticated && !decoded?.mustChangePassword && pathname === FORCED_CHANGE_PASSWORD_ROUTE) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
