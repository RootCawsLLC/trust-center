import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Middleware does two things on every (non-static) request:
//  1. Emit a per-request nonce-based Content-Security-Policy. Next.js reads the
//     CSP from the request headers and stamps the nonce onto its own scripts, so
//     inline third-party scripts (e.g. an injected XSS payload) can't execute.
//  2. A lightweight presence check that redirects obviously-unauthenticated
//     visitors away from /admin. Real authorization (session + role + ABAC) is
//     enforced server-side in the admin layout and every server action.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin gate (defense-in-depth; not the sole authz).
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const hasSession =
      req.cookies.has("authjs.session-token") || req.cookies.has("__Secure-authjs.session-token");
    if (!hasSession) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = [
    `default-src 'self'`,
    // strict-dynamic: only nonce'd scripts (Next's own) and what they load run.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    // React injects inline styles; sanitized rich text may carry style spans.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("content-security-policy", csp);
  return res;
}

export const config = {
  // Run on everything except Next static assets, image optimizer, and favicon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
