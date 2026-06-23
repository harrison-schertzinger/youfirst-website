"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SITE_CONFIG } from "@/lib/constants";
import PlayerCard from "./PlayerCard";
import PaymentDashboard from "./PaymentDashboard";
import PlayerProfileCard from "./PlayerProfileCard";
import PlayerPicker from "./PlayerPicker";

interface Guardian {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  relationship: string | null;
  is_emergency_contact: boolean;
  address_line1: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  graduation_year: number;
  position: string | null;
  jersey_number: string | null;
  photo_url: string | null;
  team_name: string | null;
  status: string;
  shirt_size: string | null;
  short_size: string | null;
  sweatshirt_size: string | null;
  shooting_shirt_size: string | null;
}

interface Payment {
  id: string;
  amount_cents: number;
  payment_method: string | null;
  payment_category: string | null;
  description: string | null;
  payment_date: string;
  season: string | null;
  status: string;
}

interface PaymentPlan {
  id: string;
  season: string;
  plan_type: string;
  total_amount_cents: number;
  amount_paid_cents: number;
  installments_total: number;
  installments_paid: number;
  next_due_date: string | null;
}

export interface PortalCharge {
  id: string;
  label: string;
  amount_cents: number;
  season: string | null;
  status: "open" | "paid" | "void";
  paid_at: string | null;
  created_at: string | null;
}

interface PlayerWithData extends Player {
  guardians: Guardian[];
  payments: Payment[];
  paymentPlan: PaymentPlan | null;
  charges: PortalCharge[];
}

export default function PortalContent() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [players, setPlayers] = useState<PlayerWithData[]>([]);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/portal/data", { cache: "no-store" });
        if (cancelled) return;
        if (res.status === 401) {
          router.replace("/fees");
          return;
        }
        if (!res.ok) {
          setLoadError("We couldn’t load your portal. Please refresh.");
          setStatus("error");
          return;
        }
        const data = (await res.json()) as { players: PlayerWithData[] };
        if (cancelled) return;
        setPlayers(data.players ?? []);
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setLoadError("Network error. Please refresh.");
          setStatus("error");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, router]);

  // Bump to re-pull the portal after linking a new player.
  const reload = () => setReloadKey((k) => k + 1);

  async function signOut() {
    await fetch("/api/portal/logout", { method: "POST" }).catch(() => {});
    router.replace("/fees");
  }

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
          <p className="text-sm text-[#9CA3AF]">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-3">
            Something Went Wrong
          </h2>
          <p className="text-[#6B7280] mb-8 leading-relaxed">{loadError}</p>
          <a
            href={`mailto:${SITE_CONFIG.email}`}
            className="inline-block px-6 py-3.5 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(74,144,217,0.4)] hover:shadow-[0_4px_24px_rgba(74,144,217,0.55)] transition-all duration-300 break-all"
          >
            Email {SITE_CONFIG.email}
          </a>
        </div>
      </div>
    );
  }

  // Signed in but not linked to any player yet → find-your-athlete picker.
  if (players.length === 0) {
    return (
      <>
        <PlayerPicker onLinked={reload} />
        <div className="text-center pb-12">
          <button
            onClick={signOut}
            className="text-sm text-[#9CA3AF] hover:text-[#6B7280] transition-colors duration-200 underline underline-offset-2"
          >
            Sign out
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-12">
        <p className="section-label mb-3">Player Portal</p>
        <h1 className="text-[2rem] md:text-[2.5rem] font-bold tracking-tight leading-[1.1] text-[#1A1A1A]">
          Welcome back
        </h1>
      </div>

      {/* Player cards */}
      {players.map((player) => (
        <div key={player.id} className="mb-16">
          <PlayerCard player={player} />
          <PlayerProfileCard
            player={player}
            onUpdated={(next) =>
              setPlayers((prev) =>
                prev.map((p) => (p.id === next.id ? { ...p, ...next } : p))
              )
            }
          />
          <PaymentDashboard
            playerId={player.id}
            payments={player.payments}
            paymentPlan={player.paymentPlan}
            charges={player.charges}
          />
        </div>
      ))}

      {/* Sign out */}
      <div className="text-center pt-8 border-t border-[#E5E7EB]">
        <button
          onClick={signOut}
          className="text-sm text-[#9CA3AF] hover:text-[#6B7280] transition-colors duration-200 underline underline-offset-2"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
