"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import PlayerCard from "./PlayerCard";
import PaymentDashboard from "./PaymentDashboard";
import PlayerProfileCard from "./PlayerProfileCard";

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

interface PlayerWithData extends Player {
  guardians: Guardian[];
  payments: Payment[];
  paymentPlan: PaymentPlan | null;
}

export default function PortalContent({
  userEmail,
  userId,
}: {
  userEmail: string;
  userId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [notSetUp, setNotSetUp] = useState(false);
  const [players, setPlayers] = useState<PlayerWithData[]>([]);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      // Find guardian record for this auth user
      const { data: guardian, error: guardianError } = await supabase
        .from("guardians")
        .select("*")
        .eq("auth_user_id", userId)
        .single();

      if (guardianError || !guardian) {
        // Try matching by email (guardian exists but auth_user_id not yet linked)
        const { data: guardianByEmail } = await supabase
          .from("guardians")
          .select("*")
          .eq("email", userEmail)
          .single();

        if (!guardianByEmail) {
          setNotSetUp(true);
          setLoading(false);
          return;
        }

        // Link auth_user_id to guardian (via service role on server)
        // For now, if email matches but auth_user_id doesn't, still show data
        // The RLS policy uses auth_user_id, so we need to use a server action to link
        // For the initial load, we'll call a server endpoint
        await fetch("/api/auth/link-guardian", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guardianId: guardianByEmail.id }),
        });

        // Reload after linking
        window.location.reload();
        return;
      }

      // Get linked player IDs
      const { data: links } = await supabase
        .from("player_guardians")
        .select("player_id")
        .eq("guardian_id", guardian.id);

      if (!links || links.length === 0) {
        setNotSetUp(true);
        setLoading(false);
        return;
      }

      const playerIds = links.map((l) => l.player_id);

      // Fetch players
      const { data: playersData } = await supabase
        .from("players")
        .select("*")
        .in("id", playerIds);

      if (!playersData || playersData.length === 0) {
        setNotSetUp(true);
        setLoading(false);
        return;
      }

      // For each player, fetch guardians, payments, and payment plan
      const enriched: PlayerWithData[] = await Promise.all(
        playersData.map(async (player) => {
          // All guardians for this player
          const { data: pgLinks } = await supabase
            .from("player_guardians")
            .select("guardian_id")
            .eq("player_id", player.id);

          const guardianIds = pgLinks?.map((l) => l.guardian_id) || [];
          const { data: guardians } = await supabase
            .from("guardians")
            .select("*")
            .in("id", guardianIds);

          // Payments
          const { data: payments } = await supabase
            .from("payments")
            .select("*")
            .eq("player_id", player.id)
            .order("payment_date", { ascending: false });

          // Payment plan (most recent)
          const { data: plans } = await supabase
            .from("payment_plans")
            .select("*")
            .eq("player_id", player.id)
            .order("created_at", { ascending: false })
            .limit(1);

          return {
            ...player,
            guardians: guardians || [],
            payments: payments || [],
            paymentPlan: plans?.[0] || null,
          };
        })
      );

      setPlayers(enriched);
      setLoading(false);
    }

    loadData();
  }, [userEmail, userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
          <p className="text-sm text-[#9CA3AF]">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (notSetUp) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="max-w-md mx-auto px-6 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#F0F1F3] flex items-center justify-center">
            <svg className="w-8 h-8 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-3">Account Not Set Up</h2>
          <p className="text-[#6B7280] mb-8 leading-relaxed">
            Your account hasn&apos;t been set up yet. Contact us and we&apos;ll get you connected to your player&apos;s profile.
          </p>
          <a
            href="mailto:kathleen@youfirstlacrosse.com"
            className="inline-block px-6 py-3.5 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_14px_rgba(74,144,217,0.4)] hover:shadow-[0_4px_24px_rgba(74,144,217,0.55)] hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            Email kathleen@youfirstlacrosse.com
          </a>
        </div>
      </div>
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
          <PlayerCard player={player} guardians={player.guardians} />
          <PlayerProfileCard
            player={player}
            onUpdated={(next) =>
              setPlayers((prev) =>
                prev.map((p) => (p.id === next.id ? { ...p, ...next } : p))
              )
            }
          />
          <PaymentDashboard
            payments={player.payments}
            paymentPlan={player.paymentPlan}
          />
        </div>
      ))}

      {/* Sign out */}
      <div className="text-center pt-8 border-t border-[#E5E7EB]">
        <button
          onClick={async () => {
            const supabase = createClient();
            await supabase.auth.signOut();
            window.location.href = "/fees";
          }}
          className="text-sm text-[#9CA3AF] hover:text-[#6B7280] transition-colors duration-200 underline underline-offset-2"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
