import Link from "next/link";
import { SITE_CONFIG, NAV_LINKS } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="bg-[#0A0A0B] py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Brand mark */}
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-white hover:text-white/80 transition-colors duration-200"
          >
            YOU<span className="text-[#4B9CD3]">.</span> FIRST
          </Link>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
            <Link
              href="/"
              className="text-white/40 hover:text-[#4B9CD3] transition-colors duration-200 py-2"
            >
              Home
            </Link>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-white/40 hover:text-[#4B9CD3] transition-colors duration-200 py-2"
              >
                {link.label}
              </Link>
            ))}
            <a
              href={`mailto:${SITE_CONFIG.email}`}
              className="text-white/40 hover:text-[#4B9CD3] transition-colors duration-200 py-2"
            >
              Contact
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/[0.06] text-center">
          <p className="text-sm text-white/25">
            &copy; {new Date().getFullYear()} YOU. FIRST Elite Lacrosse Club. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
