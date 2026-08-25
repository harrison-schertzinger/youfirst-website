import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { isEmailAllowed } from "@/lib/admin-auth";
import AdminShell from "@/components/admin/AdminShell";

// Auth + Supabase read on every request — never cache.
export const dynamic = "force-dynamic";

/**
 * Protected admin shell layout.
 *
 * Runs on every /admin route. Branches on the pathname (forwarded by
 * src/proxy.ts as `x-pathname`):
 *
 *  • /admin/login → render children plainly. No auth check; no shell.
 *  • everything else → require an authenticated, allowlisted user.
 *    Otherwise redirect to /admin/login.
 *
 * Defence is layered: client-side allowlist gate on the login form,
 * here in the layout for any rendered admin page, and again in every
 * /api/admin/* route handler so a bad cookie can't bypass via the API.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "";

  // /admin/login is the one unprotected admin route — let it render
  // without the shell so the auth check doesn't loop on itself.
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // Preview screens render what a PARENT sees, so they must not be wrapped in
  // the admin sidebar — a portal squeezed into an admin shell is not a preview
  // of anything. Auth still applies: the check below runs for these routes.
  const isPreview = pathname.startsWith("/admin/preview");

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }
  if (!isEmailAllowed(user.email)) {
    redirect("/admin/login?error=not_authorized");
  }

  if (isPreview) return <>{children}</>;

  return <AdminShell userEmail={user.email ?? ""}>{children}</AdminShell>;
}
