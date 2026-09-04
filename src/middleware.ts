import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Lightweight presence check for fast redirects. Real authorization (session
// validity + role) is enforced server-side in the admin layout and actions;
// this only avoids rendering the shell for obviously-unauthenticated visitors
// and keeps Node-only deps (Prisma, bcrypt) out of the edge runtime.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdmin = pathname.startsWith("/admin");
  const isLogin = pathname.startsWith("/admin/login");
  if (isAdmin && !isLogin) {
    const hasSession =
      req.cookies.has("authjs.session-token") ||
      req.cookies.has("__Secure-authjs.session-token");
    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
