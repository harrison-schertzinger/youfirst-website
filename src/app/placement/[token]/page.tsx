import type { Metadata } from "next";
import ConfirmClient from "@/components/placement/ConfirmClient";
import { getServiceClient } from "@/lib/placement/config";
import { findToken, isExpired } from "@/lib/placement/tokens";
import { tierLabel } from "@/lib/placement/shared";

export const dynamic = "force-dynamic";

// A tokenized link is not something search engines should ever hold.
export const metadata: Metadata = {
  title: "Confirm her spot · YOU. FIRST Elite Lacrosse",
  robots: { index: false, follow: false, nocache: true },
};

// ─── The confirmation page ───────────────────────────────────────────────────
// She arrives from one button in one email. The page already knows who she is:
// no form, no login, nothing to type. It states the placement in the club's own
// naming standard — "2030 Elite", "Elite Youth Program", "Elite Training Group"
// — and never in terms of something she did not make.
//
// COPY NOTE: the brief points at "Addendum B" for the exact wording, which was
// not supplied with this build. Rather than invent marketing copy for the page a
// family lands on, everything here is factual — her name, her placement, the
// deadline, the action. Prose can be added once Addendum B is in hand.

const INK = "#0A0A0B";
const ACCENT = "#4B9CD3";

export default async function PlacementConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const db = getServiceClient();

  if (!db) {
    return <Shell state="error" />;
  }

  let row = null;
  try {
    row = await findToken(db, token);
  } catch (err) {
    console.error("[placement page] lookup failed:", err);
    return <Shell state="error" />;
  }

  if (!row) return <Shell state="not_found" />;

  const placement = tierLabel(row.placement_tier, row.class_year);

  if (row.confirmed_at) {
    return (
      <Shell state="confirmed" name={row.athlete_name} placement={placement}>
        <ConfirmClient
          token={token}
          initiallyConfirmed
          email={row.recipient_email}
        />
      </Shell>
    );
  }

  if (isExpired(row)) {
    return (
      <Shell state="expired" name={row.athlete_name} placement={placement} />
    );
  }

  return (
    <Shell state="ready" name={row.athlete_name} placement={placement}>
      <ConfirmClient
        token={token}
        initiallyConfirmed={false}
        email={row.recipient_email}
        expiresAt={row.expires_at}
      />
    </Shell>
  );
}

function Shell({
  state,
  name,
  placement,
  children,
}: {
  state: "ready" | "confirmed" | "expired" | "not_found" | "error";
  name?: string;
  placement?: string;
  children?: React.ReactNode;
}) {
  return (
    <main
      style={{ background: INK }}
      className="flex min-h-screen flex-col items-center justify-center px-6 py-16"
    >
      <div className="w-full max-w-[520px]">
        <div
          className="text-[11px] font-bold uppercase tracking-[0.2em]"
          style={{ color: ACCENT }}
        >
          YOU. FIRST Elite Lacrosse
        </div>

        {state === "not_found" && (
          <>
            <h1 className="mt-6 text-[32px] font-extrabold leading-tight tracking-tight text-white">
              This link isn&apos;t valid.
            </h1>
            <p className="mt-4 text-[16px] leading-relaxed text-[#C9CDD3]">
              It may have been mistyped or copied incompletely. Reply to the
              email we sent and we&apos;ll send a fresh one.
            </p>
          </>
        )}

        {state === "error" && (
          <>
            <h1 className="mt-6 text-[32px] font-extrabold leading-tight tracking-tight text-white">
              We can&apos;t reach our records right now.
            </h1>
            <p className="mt-4 text-[16px] leading-relaxed text-[#C9CDD3]">
              Nothing is lost — her spot is still held. Please try this link
              again in a few minutes.
            </p>
          </>
        )}

        {state === "expired" && (
          <>
            <div className="mt-6 text-[15px] text-[#8A9099]">{name}</div>
            <h1 className="mt-2 text-[32px] font-extrabold leading-tight tracking-tight text-white">
              This link has expired.
            </h1>
            <p className="mt-4 text-[16px] leading-relaxed text-[#C9CDD3]">
              Reply to the email we sent and we&apos;ll get her confirmed.
            </p>
          </>
        )}

        {(state === "ready" || state === "confirmed") && (
          <>
            <div
              className="mt-8 text-[13px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: ACCENT }}
            >
              {placement}
            </div>
            <h1 className="mt-2 text-[38px] font-extrabold leading-[1.1] tracking-tight text-white">
              {name}
            </h1>
          </>
        )}

        {children}
      </div>

      <div className="mt-16 text-[12px] text-[#8A9099]">
        YOU. FIRST Elite Lacrosse Club · Cincinnati, Ohio
      </div>
    </main>
  );
}
