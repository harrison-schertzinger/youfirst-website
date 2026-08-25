"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { isEmailAllowed } from "@/lib/admin-auth";

/**
 * Command Center sign-in — email + password.
 *
 * Replaced the magic-link flow on 2026-08-25. The magic link meant every
 * sign-in required leaving the browser, finding an email, and clicking through
 * — for two operators who log in constantly, that is friction with no security
 * return, since the allowlist is what actually gates access.
 *
 * Defence is still layered and unchanged behind this form:
 *   1. this client-side allowlist check (stops a wrong address before it hits
 *      the network),
 *   2. src/app/admin/layout.tsx re-checks the allowlist server-side for every
 *      rendered /admin page,
 *   3. every /api/admin/* route handler checks it again, so a forged cookie
 *      cannot reach data through the API.
 *
 * Supabase enforces the password itself. A correct password for an address that
 * is NOT on the allowlist still yields no admin access — the layout bounces it.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!queryError) return;
    if (queryError === "not_authorized") {
      setError("That account doesn't have access to the Command Center.");
    } else if (queryError === "signed_out") {
      setError(null);
    } else {
      setError("Please sign in again.");
    }
  }, [queryError]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setError(null);
    setSubmitting(true);

    const trimmed = email.trim().toLowerCase();

    // Defence-in-depth: don't even attempt a sign-in for a non-allowlist
    // address. The layout enforces this again server-side.
    if (!isEmailAllowed(trimmed)) {
      setError("This email is not authorized for admin access.");
      setSubmitting(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });

      if (signInError) {
        // Deliberately generic — never reveal whether the address exists.
        setError("That email and password don't match.");
        setSubmitting(false);
        return;
      }

      // The browser client has written the session cookies; refresh so the
      // server layout sees them, then hand off to the Command Center.
      router.refresh();
      router.replace("/admin");
    } catch (err) {
      console.error("[admin/login] threw:", err);
      setError("Network error. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[400px]">
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-8">
          <div className="text-center">
            <div className="text-[20px] font-bold tracking-tight text-[#0A0A0B]">
              You. First
            </div>
            <div className="mt-1 text-sm text-[#6B7280]">Command Center</div>
          </div>

          <div className="my-7 h-px w-full bg-[#E5E7EB]" />

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <label className="block">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] mb-1.5">
                Email
              </span>
              <input
                type="email"
                autoFocus
                required
                autoComplete="username"
                spellCheck={false}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="you@theyoufirstproject.com"
                className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-[14px] text-[#0A0A0B] placeholder:text-[#6B7280]/60 focus:outline-none focus:ring-2 focus:border-[#4A90D9] focus:ring-[#4A90D9]/20 transition-colors"
              />
            </label>

            <label className="block">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-[#6B7280] mb-1.5">
                Password
              </span>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••••••"
                className="w-full bg-white border border-[#E5E7EB] rounded-lg px-3 py-2.5 text-[14px] text-[#0A0A0B] placeholder:text-[#6B7280]/60 focus:outline-none focus:ring-2 focus:border-[#4A90D9] focus:ring-[#4A90D9]/20 transition-colors"
              />
            </label>

            {error && (
              <p role="alert" className="text-[12px] text-[#EF4444]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || email.trim() === "" || password === ""}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#4A90D9] text-white text-[13px] font-semibold tracking-wide hover:bg-[#3A7BC8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">
          Authorized access only
        </p>
      </div>
    </main>
  );
}
