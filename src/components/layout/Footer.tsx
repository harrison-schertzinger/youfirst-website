import Link from "next/link";
import { SITE_CONFIG, NAV_LINKS } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="bg-footer-bg text-white">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-8 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
          {/* Brand column */}
          <div>
            <div className="flex items-baseline gap-[3px] mb-4 tracking-[0.03em]">
              <span className="text-[19px] font-extrabold">YOU</span>
              <span className="text-[19px] font-extrabold text-accent-blue">.</span>
              <span className="text-[19px] font-medium tracking-[0.05em] ml-[2px]">FIRST</span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed mb-6">
              {SITE_CONFIG.location}
              <br />
              Part of the {SITE_CONFIG.parent}
            </p>
            {/* Backwards .uoY */}
            <p
              className="text-3xl font-extrabold text-white/10 tracking-[0.03em] select-none"
              aria-hidden="true"
              style={{ transform: "scaleX(-1)", display: "inline-block" }}
            >
              YOU.
            </p>
          </div>

          {/* Links column */}
          <div>
            <h3 className="section-label text-white/40 mb-6">
              Quick Links
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/"
                  className="text-sm text-white/70 hover:text-white transition-colors"
                >
                  Home
                </Link>
              </li>
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact column */}
          <div>
            <h3 className="section-label text-white/40 mb-6">
              Contact
            </h3>
            <a
              href={`mailto:${SITE_CONFIG.email}`}
              className="text-sm text-white/70 hover:text-white transition-colors block mb-4"
            >
              {SITE_CONFIG.email}
            </a>
            {/* Social placeholders */}
            <div className="flex gap-4 mt-6">
              {["Instagram", "Twitter", "Facebook"].map((platform) => (
                <a
                  key={platform}
                  href="#"
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/50 hover:bg-accent-blue hover:text-white transition-all text-xs font-semibold"
                  aria-label={platform}
                >
                  {platform[0]}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 pt-8 border-t border-white/10 text-center">
          <p className="text-xs text-white/40">
            &copy; {new Date().getFullYear()} YOU. FIRST Elite Lacrosse Club.
            All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
