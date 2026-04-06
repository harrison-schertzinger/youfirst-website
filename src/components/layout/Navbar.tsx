"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { NAV_LINKS } from "@/lib/constants";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
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
          ? "bg-white/95 backdrop-blur-md border-b border-black/5 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between lg:h-20">
          {/* Wordmark — brand mark, not a text label */}
          <Link
            href="/"
            className={`text-[17px] font-extrabold tracking-[0.04em] transition-colors ${
              scrolled ? "text-text-primary" : "text-white"
            }`}
          >
            YOU<span className="text-accent-blue">.</span> FIRST ELITE LACROSSE
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[12px] font-medium uppercase tracking-[0.1em] transition-colors hover:text-accent-blue ${
                  scrolled
                    ? "text-text-secondary"
                    : "text-white/80 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
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
                className={`block h-[2px] rounded-full transition-all duration-300 ${
                  mobileOpen
                    ? "rotate-45 translate-y-[7px] bg-text-primary"
                    : scrolled
                    ? "bg-text-primary"
                    : "bg-white"
                }`}
              />
              <span
                className={`block h-[2px] rounded-full transition-all duration-300 ${
                  mobileOpen
                    ? "opacity-0"
                    : scrolled
                    ? "bg-text-primary"
                    : "bg-white"
                }`}
              />
              <span
                className={`block h-[2px] rounded-full transition-all duration-300 ${
                  mobileOpen
                    ? "-rotate-45 -translate-y-[7px] bg-text-primary"
                    : scrolled
                    ? "bg-text-primary"
                    : "bg-white"
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      <div
        className={`fixed inset-0 bg-white z-40 transition-all duration-500 lg:hidden ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex flex-col items-center justify-center h-full gap-8">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="text-lg font-medium uppercase tracking-[0.1em] text-text-primary hover:text-accent-blue transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
