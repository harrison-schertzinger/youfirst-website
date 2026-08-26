"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Portal sign-in.
 *
 * There is no self-registration here, deliberately. A family does not join the
 * club through a web form — they are entered from the Command Center and sent a
 * link. Offering "Register Your Player" under the sign-in invited people to try
 * a route that does not exist and made the page look like a storefront rather
 * than a door. Email, password, in.
 */
export default function ParentPortal() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "signing" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("signing");
    setErrorMsg("");

    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        // Token cookie is set by the server. The portal decides whether to
        // show the player (if linked) or the "find your athlete" picker.
        router.push("/portal");
        router.refresh();
        return;
      }

      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus("error");
      setErrorMsg(data.error ?? "We couldn’t sign you in. Please try again.");
    } catch {
      setStatus("error");
      setErrorMsg("Network error. Check your connection and try again.");
    }
  }

  return (
    <section className="relative min-h-[calc(100vh-80px)] flex items-center justify-center bg-background overflow-hidden">
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 30%, rgba(74, 144, 217, 0.05), transparent)",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-lg px-6 py-16">
        {/* ─── Sign-in section ─── */}
        <div className="text-center">
          {/* Section label */}
          <p
            className={`section-label mb-6 transition-all duration-700 ${
              loaded ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
            }`}
          >
            Player Portal
          </p>

          {/* Headline */}
          <h1
            className={`text-[2.5rem] sm:text-[3.5rem] font-extrabold tracking-[-0.03em] leading-[0.95] mb-5 transition-all duration-800 ${
              loaded ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
            }`}
            style={{ transitionDelay: "150ms" }}
          >
            <span className="gradient-text-accent">Welcome Back</span>
          </h1>

          {/* Subline */}
          <p
            className={`text-base text-[#6B7280] leading-[1.75] mb-10 transition-all duration-800 ${
              loaded ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
            }`}
            style={{ transitionDelay: "300ms" }}
          >
            Enter your email and password to see what&apos;s due.
          </p>

          <form
            onSubmit={handleSubmit}
            className={`flex flex-col gap-3 transition-all duration-800 ${
              loaded ? "opacity-100 translate-y-0 blur-0" : "opacity-0 translate-y-4 blur-sm"
            }`}
            style={{ transitionDelay: "450ms" }}
          >
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@email.com"
              disabled={status === "signing"}
              className="w-full px-5 py-3.5 rounded-xl border border-[#E5E7EB] bg-white text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 disabled:opacity-50"
            />
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                disabled={status === "signing"}
                className="flex-1 px-5 py-3.5 rounded-xl border border-[#E5E7EB] bg-white text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue transition-all duration-200 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={status === "signing"}
                className="px-6 py-3.5 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(74,144,217,0.4)] hover:shadow-[0_4px_24px_rgba(74,144,217,0.55)] hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 whitespace-nowrap disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:scale-100"
              >
                {status === "signing" ? "Signing in..." : "Sign In"}
              </button>
            </div>

            {status === "error" && (
              <p className="text-sm text-red-500 mt-1 text-left">{errorMsg}</p>
            )}
          </form>
        </div>

      </div>

    </section>
  );
}
