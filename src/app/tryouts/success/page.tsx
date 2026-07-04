import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import ScrollProgressBar from "@/components/layout/ScrollProgressBar";
import { getStripe } from "@/lib/stripe";
import {
  TRYOUT_FEE_LABEL,
  TRYOUT_PHOTOS,
  describeTryout,
  type TryoutDisplay,
  type TryoutType,
} from "@/lib/tryouts";

export const metadata: Metadata = {
  title: "Registration Confirmed | YOU. FIRST Elite Lacrosse",
  description: "Your 2026 YOU. FIRST Elite Lacrosse tryout registration is confirmed.",
  robots: { index: false, follow: false },
};

interface RegView {
  playerFullName: string;
  parentName: string;
  tryout: TryoutDisplay;
}

async function loadRegistration(sessionId: string | null): Promise<RegView | null> {
  if (!sessionId) return null;

  const stripe = getStripe();
  if (!stripe) return null;

  // Verify the session is real and actually paid before showing success.
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") return null;
  } catch {
    return null;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data } = await supabase
    .from("tryout_registrations")
    .select("player_full_name, parent_name, tryout_type, tryout_date, tryout_group")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (!data) return null;

  const tryout = describeTryout({
    type: (data.tryout_type as TryoutType) ?? "scheduled",
    isoDate: data.tryout_date,
    group: data.tryout_group,
  });

  return {
    playerFullName: data.player_full_name,
    parentName: data.parent_name,
    tryout,
  };
}

const BRING = [
  "Lacrosse stick & goggles",
  "Cleats + water",
  "Mouthguard",
  "A light + dark shirt",
];

export default async function TryoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const sessionId = typeof params.session_id === "string" ? params.session_id : null;
  const reg = await loadRegistration(sessionId);

  return (
    <>
      <ScrollProgressBar />
      <Navbar />
      <main className="relative min-h-screen bg-[#0A0A0B] overflow-hidden">
        {/* Cinematic darkened photo top — swap via TRYOUT_PHOTOS.success */}
        <div className="absolute inset-x-0 top-0 h-[60vh]">
          <Image
            src={TRYOUT_PHOTOS.success}
            alt=""
            aria-hidden="true"
            fill
            priority
            className="object-cover object-[center_30%]"
            sizes="100vw"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to bottom, rgba(10,10,11,0.72) 0%, rgba(10,10,11,0.82) 55%, #0A0A0B 100%)",
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-[600px] px-6 pt-32 pb-28">
          <div className="rounded-2xl border border-white/12 bg-white/[0.05] backdrop-blur-md p-8 sm:p-12 text-center">
            {/* Check badge */}
            <div className="mx-auto mb-7 w-16 h-16 rounded-full bg-accent-blue/20 border border-accent-blue/30 flex items-center justify-center">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  stroke="#4B9CD3"
                  strokeWidth="2.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <p className="section-label mb-4">Registration Confirmed</p>

            {reg ? (
              <>
                <h1 className="text-[2rem] sm:text-[2.75rem] font-bold leading-[1.05] tracking-tight text-white mb-5">
                  She&apos;s In. 🥍
                </h1>
                <p className="text-lg text-white/65 leading-[1.7] mb-8">
                  <strong className="text-white">{reg.playerFullName}</strong> is
                  registered and your {TRYOUT_FEE_LABEL} fee is paid — her spot is
                  secured.
                </p>

                <div className="rounded-xl border border-accent-blue/30 bg-accent-blue/[0.10] px-6 py-5 mb-8 text-left">
                  <p className="text-[11px] uppercase tracking-[0.15em] text-accent-blue font-semibold mb-1">
                    Her {reg.tryout.typeLabel} Tryout
                  </p>
                  <p className="text-[1.6rem] font-extrabold text-white leading-tight">
                    {reg.tryout.dateLine}
                  </p>
                  <p className="text-[14px] text-white/55 mt-1">
                    {reg.tryout.time} · {reg.tryout.location}
                  </p>
                </div>

                <div className="text-left mb-9">
                  <p className="text-[12px] uppercase tracking-[0.15em] text-white/45 font-semibold mb-3">
                    What to bring
                  </p>
                  <ul className="space-y-2.5">
                    {BRING.map((item) => (
                      <li key={item} className="flex items-center gap-3 text-[15px] text-white/85">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent-blue/20 flex items-center justify-center">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="#4B9CD3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[14px] text-white/50 leading-[1.7] mt-5">
                    Arrive 15 minutes early to check in at {reg.tryout.location}.
                    Questions before then? Email{" "}
                    <a
                      href="mailto:kathleen@youfirstlacrosse.com"
                      className="text-white/70 hover:text-accent-blue transition-colors"
                    >
                      kathleen@youfirstlacrosse.com
                    </a>
                    .
                  </p>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-[2rem] sm:text-[2.5rem] font-bold leading-[1.05] tracking-tight text-white mb-5">
                  Payment Received
                </h1>
                <p className="text-lg text-white/65 leading-[1.7] mb-9">
                  Thank you — your registration is being finalized. If you don&apos;t
                  receive a confirmation email shortly, please email{" "}
                  <a
                    href="mailto:kathleen@youfirstlacrosse.com"
                    className="text-accent-blue font-medium"
                  >
                    kathleen@youfirstlacrosse.com
                  </a>{" "}
                  and we&apos;ll sort it out right away.
                </p>
              </>
            )}

            <Link
              href="/"
              className="inline-flex items-center justify-center px-8 py-4 bg-accent-blue text-white text-[13px] font-semibold uppercase tracking-[0.1em] rounded-xl shadow-[0_4px_18px_rgba(74,144,217,0.45)] hover:shadow-[0_6px_28px_rgba(74,144,217,0.6)] hover:-translate-y-0.5 transition-all duration-300"
            >
              Back to Home
            </Link>
          </div>

          <p className="text-center text-[13px] text-white/35 mt-8">
            Questions? Email{" "}
            <a href="mailto:kathleen@youfirstlacrosse.com" className="text-white/55 hover:text-accent-blue transition-colors">
              kathleen@youfirstlacrosse.com
            </a>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
