import { NextResponse, type NextRequest } from "next/server";

/**
 * Minimal proxy. Sole job: forward the current pathname as a header so
 * `src/app/admin/layout.tsx` can decide whether to enforce auth + render
 * the admin shell, or pass the login page through cleanly.
 *
 * Without this header, a server-component layout has no reliable way to
 * detect the request pathname in Next 16 — and a blanket auth redirect
 * in the admin layout would create an infinite loop on /admin/login.
 *
 * This proxy does NOT perform any auth check itself. All auth and
 * allowlist enforcement lives in the layout + API routes.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      // Forward a copy of the original headers + the pathname.
      headers: new Headers(request.headers),
    },
  });
  response.headers.set("x-pathname", request.nextUrl.pathname);

  // Mirror the header back onto the request that server components see.
  // Next 16 reads the request via `headers()` in next/headers — the
  // pattern below ensures that helper sees our header on the way in.
  request.headers.set("x-pathname", request.nextUrl.pathname);
  return response;
}

export const config = {
  // Only run for admin URLs (pages + the admin API routes). Everything
  // else is untouched so the parent portal, marketing pages, and Stripe
  // webhook stay on the existing fast path.
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
