"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  Users,
  UserPlus,
  Receipt,
  Trophy,
  Mail,
  Send,
  TrendingUp,
  MessageSquare,
  Menu,
  X,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Roster", Icon: ClipboardList },
  { href: "/admin/prospects", label: "Prospects", Icon: UserPlus },
  { href: "/admin/tryouts", label: "Tryouts", Icon: ClipboardCheck },
  { href: "/admin/placements", label: "Placements", Icon: Send },
  { href: "/admin/players", label: "Players", Icon: Users },
  { href: "/admin/expenses", label: "Expenses", Icon: Receipt },
  { href: "/admin/tournaments", label: "Tournaments", Icon: Trophy },
  { href: "/admin/templates", label: "Templates", Icon: Mail },
  { href: "/admin/questions", label: "Questions", Icon: MessageSquare },
  { href: "/admin/financials", label: "Financials", Icon: TrendingUp },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminShell({
  userEmail,
  children,
}: {
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* ── Mobile top bar (hidden on md+) ── */}
      <header className="md:hidden print:hidden sticky top-0 z-30 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-bold tracking-tight text-[#0A0A0B]">
            You. First
          </span>
          <span className="text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">
            Command Center
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="p-2 rounded-md text-[#6B7280] hover:text-[#0A0A0B] hover:bg-[#F8F9FA] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* ── Mobile drawer + scrim ── */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/30"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <Sidebar
            pathname={pathname}
            userEmail={userEmail}
            onLinkClick={() => setMobileOpen(false)}
            className="md:hidden fixed inset-y-0 left-0 z-50 w-[260px] shadow-xl"
            showClose
            onClose={() => setMobileOpen(false)}
          />
        </>
      )}

      {/* ── Desktop fixed sidebar (md+) ── */}
      <Sidebar
        pathname={pathname}
        userEmail={userEmail}
        className="hidden md:flex print:hidden! fixed inset-y-0 left-0 w-[240px] border-r border-[#E5E7EB]"
      />

      {/* ── Main content area ── */}
      <main className="md:ml-[240px] print:ml-0 min-h-screen">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-10 py-8 md:py-12 print:max-w-none print:px-0 print:py-0">
          {children}
        </div>
      </main>
    </div>
  );
}

function Sidebar({
  pathname,
  userEmail,
  className,
  onLinkClick,
  showClose,
  onClose,
}: {
  pathname: string;
  userEmail: string;
  className?: string;
  onLinkClick?: () => void;
  showClose?: boolean;
  onClose?: () => void;
}) {
  return (
    <aside
      className={[
        "flex-col bg-white",
        className ?? "",
      ].join(" ")}
      style={{ display: className?.includes("flex") || className?.includes("fixed") ? "flex" : undefined }}
    >
      {/* Wordmark */}
      <div className="flex items-start justify-between px-6 pt-7 pb-6">
        <div>
          <div className="text-[17px] font-bold tracking-tight text-[#0A0A0B]">
            You. First
          </div>
          <div className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-[#6B7280]">
            Command Center
          </div>
        </div>
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="p-1.5 -mr-1.5 rounded-md text-[#6B7280] hover:text-[#0A0A0B] hover:bg-[#F8F9FA] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onLinkClick}
                  className={[
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
                    active
                      ? "bg-[#4A90D9]/[0.08] text-[#4A90D9]"
                      : "text-[#6B7280] hover:text-[#0A0A0B] hover:bg-[#F8F9FA]",
                  ].join(" ")}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom: signed-in identity */}
      <div className="px-6 py-5 border-t border-[#E5E7EB]">
        <div className="text-[10px] uppercase tracking-[0.16em] text-[#6B7280]">
          Signed in
        </div>
        <div className="mt-1 text-[12px] text-[#0A0A0B] truncate" title={userEmail}>
          {userEmail || "—"}
        </div>
      </div>
    </aside>
  );
}
