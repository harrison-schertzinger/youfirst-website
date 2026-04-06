"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { NAV_LINKS } from "@/lib/constants";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.06)]"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand mark */}
          <Link
            href="/"
            className={`text-[15px] font-extrabold tracking-tight transition-colors duration-200 ${
              scrolled ? "text-[#1A1A1A]" : "text-white"
            }`}
          >
            YOU<span className="text-accent-blue">.</span> FIRST
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link text-[12px] font-medium uppercase tracking-[0.12em] transition-colors duration-200 ${
                  scrolled
                    ? "text-[#6B7280] hover:text-[#1A1A1A]"
                    : "text-white/70 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/register"
              className="ml-2 px-5 py-2 bg-accent-blue text-white text-[11px] font-semibold uppercase tracking-[0.12em] rounded-lg shadow-[0_4px_14px_rgba(74,144,217,0.35)] hover:shadow-[0_4px_20px_rgba(74,144,217,0.5)] hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              Join Us
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden relative z-50 w-10 h-10 flex items-center justify-center"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            <div className="w-6 flex flex-col gap-[5px]">
              <span
                className={`block h-[1.5px] rounded-full transition-all duration-300 ${
                  mobileOpen
                    ? "rotate-45 translate-y-[6.5px] bg-[#1A1A1A]"
                    : scrolled
                    ? "bg-[#1A1A1A]"
                    : "bg-white"
                }`}
              />
              <span
                className={`block h-[1.5px] rounded-full transition-all duration-300 ${
                  mobileOpen
                    ? "opacity-0 scale-x-0"
                    : scrolled
                    ? "bg-[#1A1A1A]"
                    : "bg-white"
                }`}
              />
              <span
                className={`block h-[1.5px] rounded-full transition-all duration-300 ${
                  mobileOpen
                    ? "-rotate-45 -translate-y-[6.5px] bg-[#1A1A1A]"
                    : scrolled
                    ? "bg-[#1A1A1A]"
                    : "bg-white"
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      <div
        className={`fixed inset-0 bg-white/95 backdrop-blur-xl z-40 transition-all duration-500 lg:hidden ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex flex-col items-center justify-center h-full gap-8">
          {NAV_LINKS.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="text-lg font-medium uppercase tracking-[0.12em] text-[#1A1A1A] hover:text-accent-blue transition-colors duration-200"
              style={{
                opacity: mobileOpen ? 1 : 0,
                transform: mobileOpen ? "translateY(0)" : "translateY(12px)",
                transition: `opacity 0.3s ${i * 0.05 + 0.15}s, transform 0.3s ${i * 0.05 + 0.15}s`,
              }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/register"
            onClick={() => setMobileOpen(false)}
            className="mt-4 px-8 py-3.5 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(74,144,217,0.35)] transition-all duration-300"
            style={{
              opacity: mobileOpen ? 1 : 0,
              transform: mobileOpen ? "translateY(0)" : "translateY(12px)",
              transition: `opacity 0.3s 0.4s, transform 0.3s 0.4s`,
            }}
          >
            Join Us
          </Link>
        </div>
      </div>
    </nav>
  );
}
