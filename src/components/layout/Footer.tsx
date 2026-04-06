import Link from "next/link";
import { SITE_CONFIG, NAV_LINKS } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="bg-[#0A0A0B] text-white">
      {/* Top gradient divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-[1280px] px-6 lg:px-8 py-16 lg:py-20">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-12">
          {/* Brand column */}
          <div className="lg:max-w-xs">
            <div className="flex items-baseline gap-[2px] mb-4">
              <span className="text-[16px] font-extrabold tracking-tight">YOU</span>
              <span className="text-[16px] font-extrabold text-accent-blue">.</span>
              <span className="text-[16px] font-medium tracking-[0.04em] ml-[2px]">FIRST</span>
            </div>
            <p className="text-white/30 text-sm leading-relaxed">
              {SITE_CONFIG.location}
              <br />
              Part of the {SITE_CONFIG.parent}
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-x-12 gap-y-6">
            <Link
              href="/"
              className="text-sm text-white/40 hover:text-accent-blue transition-colors duration-200"
            >
              Home
            </Link>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-white/40 hover:text-accent-blue transition-colors duration-200"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Contact */}
          <div>
            <a
              href={`mailto:${SITE_CONFIG.email}`}
              className="text-sm text-white/40 hover:text-accent-blue transition-colors duration-200"
            >
              {SITE_CONFIG.email}
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-white/[0.06]">
          <p className="text-xs text-white/20">
            &copy; {new Date().getFullYear()} YOU. FIRST Elite Lacrosse Club. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
