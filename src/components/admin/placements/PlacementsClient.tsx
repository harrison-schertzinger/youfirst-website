"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Eye,
  Loader2,
  Mail,
  RefreshCw,
  RotateCw,
  Send,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  approvalPhrase,
  deliveryLabel,
  NUDGE_APPROVAL,
  NUDGE_DAYS,
  RESEND_BLOCK_LABEL,
  RESEND_COOLDOWN_SECONDS,
  SKIP_REASON_LABEL,
  type SendAudience,
  type SendCandidate,
  type SendEvent,
  type SendGroup,
  type SendableTier,
} from "@/lib/placement/shared";

// ─── Placements — the send screen ────────────────────────────────────────────
// The screen shows NAMES, never counts, for every bucket — including the ones
// being skipped. Nothing here decides who receives an email: the server
// re-derives the recipient list on every call. This surface exists so a human
// can see the list before it goes and refuse.

type Mode = "dry_run" | "test" | "live";

interface SendOutcome {
  name: string;
  email: string;
  ok: boolean;
  error?: string;
}
interface SkippedAthlete {
  name: string;
  reason: string;
  detail: string;
}
interface SendReport {
  mode: Mode;
  tier: SendableTier;
  attempted: number;
  sent: SendOutcome[];
  failed: SendOutcome[];
  skipped: SkippedAthlete[];
  refusal?: string;
}

interface Preview {
  /** Set by the client so the modal can send this one athlete as a test. */
  athleteKey?: string;
  tier?: SendableTier;
  name: string;
  email: string | null;
  placementLabel: string;
  subject?: string;
  html?: string;
  text?: string;
  confirmUrl?: string;
  blocked?: { reason: string; detail: string };
}

/** What a resend attempt came back with. */
interface ResendResult {
  ok: boolean;
  error?: string;
  name?: string;
  to?: string;
  attempt?: number;
  cooldownRemaining?: number;
  correction?: {
    from: string | null;
    to: string;
    label: string;
    alsoAffects: string[];
  };
}

const CARD = "rounded-2xl border border-[#E5E8EC] bg-white";
const BTN =
  "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Every athlete on the screen, whatever bucket she is sitting in. */
function allCandidates(data: SendAudience): SendCandidate[] {
  const out: SendCandidate[] = [];
  for (const g of data.groups) {
    out.push(...g.ready, ...g.alreadySent, ...g.cannotContact);
  }
  out.push(...data.noClassYear);
  return out;
}

export default function PlacementsClient({ initial }: { initial: SendAudience }) {
  const [data, setData] = useState<SendAudience>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [reports, setReports] = useState<Record<string, SendReport>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [sentToMe, setSentToMe] = useState<string | null>(null);
  const [resendFor, setResendFor] = useState<SendCandidate | null>(null);
  const [resendResult, setResendResult] = useState<ResendResult | null>(null);
  /** athlete key → epoch ms the cooldown expires. Survives closing the modal. */
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({});

  const refresh = useCallback(async (): Promise<SendAudience | null> => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/placements", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Refresh failed.");
      setData(json as SendAudience);
      return json as SendAudience;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed.");
      return null;
    } finally {
      setRefreshing(false);
    }
  }, []);

  const openPreview = useCallback(
    async (athleteKey: string, tier: SendableTier) => {
      setPreviewLoading(athleteKey);
      setError(null);
      try {
        const res = await fetch("/api/admin/placements/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ athleteKey }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Preview failed.");
        // Carry the identity through so the modal can test-send this one.
        setPreview({ ...(json as Preview), athleteKey, tier });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Preview failed.");
      } finally {
        setPreviewLoading(null);
      }
    },
    [],
  );

  /** This athlete's email, delivered to the signed-in admin. One email. */
  const testOne = useCallback(async (athleteKey: string, tier: SendableTier) => {
    setBusy("preview:test");
    setError(null);
    try {
      const res = await fetch("/api/admin/placements/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, mode: "test", athleteKey }),
      });
      const json = (await res.json()) as SendReport & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Test send failed.");
      const ok = json.sent?.length ?? 0;
      setError(
        ok > 0
          ? null
          : (json.failed?.[0]?.error ??
            json.skipped?.[0]?.detail ??
            "Nothing was sent."),
      );
      if (ok > 0) setSentToMe(athleteKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test send failed.");
    } finally {
      setBusy(null);
    }
  }, []);

  /**
   * Send one family her placement email again, optionally to a corrected
   * address.
   *
   * THE DOUBLE-FIRE DEFENCE IS THREE-DEEP, and only the last one is real:
   * the in-flight lock below, a cooldown the button honours, and the server's
   * atomic claim against hermes_send_log. A browser that is refreshed mid-send
   * defeats the first two and never the third.
   */
  const runResend = useCallback(
    async (athlete: SendCandidate, mode: "test" | "live", email: string) => {
      const busyKey = `resend:${athlete.key}:${mode}`;
      setBusy(busyKey);
      setError(null);
      setResendResult(null);
      try {
        const res = await fetch("/api/admin/placements/resend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ athleteKey: athlete.key, mode, email }),
        });
        const json = (await res.json()) as ResendResult;
        setResendResult({ ...json, ok: res.ok && json.ok });

        if (res.status === 429 && json.cooldownRemaining) {
          setCooldowns((c) => ({
            ...c,
            [athlete.key]: Date.now() + json.cooldownRemaining! * 1000,
          }));
          return;
        }
        if (!res.ok || !json.ok) return;

        if (mode === "live") {
          setCooldowns((c) => ({
            ...c,
            [athlete.key]: Date.now() + RESEND_COOLDOWN_SECONDS * 1000,
          }));
          // Pull the history back down so the timeline in front of the operator
          // is the one in the database, not the one from before the click.
          const fresh = await refresh();
          if (fresh) {
            const updated = allCandidates(fresh).find((c) => c.key === athlete.key);
            if (updated) setResendFor(updated);
          }
        }
      } catch (e) {
        setResendResult({
          ok: false,
          error: e instanceof Error ? e.message : "Resend failed.",
        });
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const openResend = useCallback((athlete: SendCandidate) => {
    setResendResult(null);
    setResendFor(athlete);
  }, []);

  const runSend = useCallback(
    async (group: SendGroup, mode: Mode) => {
      const { tier, classKey, key: gk } = group;
      const busyKey = `${gk}:${mode}`;
      setBusy(busyKey);
      setError(null);
      try {
        const res = await fetch("/api/admin/placements/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tier,
            classKey,
            mode,
            confirmation: mode === "live" ? (typed[gk] ?? "") : undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Send failed.");
        setReports((r) => ({ ...r, [gk]: json as SendReport }));
        if (mode === "live") {
          setTyped((t) => ({ ...t, [gk]: "" }));
          await refresh();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Send failed.");
      } finally {
        setBusy(null);
      }
    },
    [typed, refresh],
  );

  const runNudge = useCallback(
    async (day: number, mode: Mode) => {
      const busyKey = `nudge${day}:${mode}`;
      setBusy(busyKey);
      setError(null);
      try {
        const res = await fetch("/api/admin/placements/nudge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            day,
            mode,
            confirmation: mode === "live" ? (typed[`nudge${day}`] ?? "") : undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Nudge failed.");
        setReports((r) => ({ ...r, [`nudge${day}`]: json as SendReport }));
        if (mode === "live") {
          setTyped((t) => ({ ...t, [`nudge${day}`]: "" }));
          await refresh();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Nudge failed.");
      } finally {
        setBusy(null);
      }
    },
    [typed, refresh],
  );

  const unwrittenTemplates = useMemo(
    () =>
      data.templateHealth.filter(
        (t) =>
          !t.found ||
          t.unwritten.length > 0 ||
          t.missingRegions.length > 0 ||
          t.banned.length > 0,
      ),
    [data.templateHealth],
  );

  const totals = useMemo(() => {
    let ready = 0;
    let sent = 0;
    let blocked = 0;
    for (const g of data.groups) {
      ready += g.ready.length;
      sent += g.alreadySent.length;
      blocked += g.cannotContact.length;
    }
    return { ready, sent, blocked };
  }, [data.groups]);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A0A0B]">
            Placements
          </h1>
          <p className="mt-1 text-[13px] text-[#6B7280]">
            {data.campaign} · {data.season} season · {totals.ready} ready ·{" "}
            {totals.sent} already sent · {totals.blocked} cannot be contacted
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className={`${BTN} border border-[#E5E8EC] text-[#374151] hover:bg-[#F8F9FA]`}
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/5 px-4 py-3 text-[13px] text-[#B91C1C]">
          {error}
        </div>
      )}

      {/* ── Template gate ──────────────────────────────────────────────── */}
      {unwrittenTemplates.length > 0 && (
        <div className="rounded-2xl border border-[#F59E0B]/40 bg-[#FFFBEB] p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#B45309]" />
            <div className="min-w-0">
              <div className="text-[14px] font-bold text-[#92400E]">
                Copy is not finished — these cannot send yet
              </div>
              <p className="mt-1 text-[13px] leading-relaxed text-[#92400E]/90">
                A template carrying a{" "}
                <code className="rounded bg-[#92400E]/10 px-1">[[ ]]</code> block, or
                language Addendum B bans, is blocked at every level: preview, test
                and live. Edit the copy in{" "}
                <Link href="/admin/templates" className="underline">
                  Templates
                </Link>
                .
              </p>
              <ul className="mt-3 space-y-1.5 text-[13px] text-[#92400E]">
                {unwrittenTemplates.map((t) => (
                  <li key={t.templateName}>
                    <span className="font-semibold">{t.templateName}</span>
                    {!t.found ? (
                      <span> — not found</span>
                    ) : (
                      <>
                        {t.unwritten.length > 0 && (
                          <span> — unwritten: {t.unwritten.join(", ")}</span>
                        )}
                        {t.missingRegions.length > 0 && (
                          <span> — missing: {t.missingRegions.join(", ")}</span>
                        )}
                        {t.banned.length > 0 && (
                          <span className="font-semibold text-[#B91C1C]">
                            {" "}
                            — Addendum B bans {t.banned.join(", ")}
                          </span>
                        )}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── Never in the audience ──────────────────────────────────────── */}
      <div className={`${CARD} px-5 py-4`}>
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">
          Excluded from every send
        </div>
        <p className="mt-2 text-[13px] text-[#374151]">
          {data.excluded.length === 0 ? (
            "Everyone on the roster is in a sendable placement."
          ) : (
            <>
              {data.excluded.map((e, i) => (
                <span key={e.tier}>
                  {i > 0 && " · "}
                  <span className="font-semibold">{e.count}</span> {e.label.toLowerCase()}
                </span>
              ))}
              . None of them can be emailed from this screen — the block is in the
              send path and in the database, not in this list.
            </>
          )}
        </p>
      </div>

      {/* ── Groups, by class ───────────────────────────────────────────── */}
      {/* One heading per graduation class, its placements beneath it, then
          You First Blue on its own — it is one team across 2029 and 2030 and
          belongs to no single class. */}
      {data.groups.map((group, i) => {
        const prev = data.groups[i - 1];
        const newClass = !prev || prev.classKey !== group.classKey;
        const firstOfTier =
          data.groups.findIndex((g) => g.tier === group.tier) === i;
        return (
          <div key={group.key} className={newClass ? "pt-2" : undefined}>
            {newClass && (
              <h2
                id={group.classKey ? `class-${group.classKey.replace("/", "-")}` : "class-blue"}
                className="mb-3 scroll-mt-24 text-[15px] font-bold tracking-tight text-[#0A0A0B]"
              >
                {group.classKey ? `Class of ${group.classKey}` : "You First Blue"}
                {!group.classKey && (
                  <span className="ml-2 text-[12px] font-medium text-[#6B7280]">
                    one team · 2029 + 2030
                  </span>
                )}
              </h2>
            )}
            <GroupCard
              group={group}
              firstOfTier={firstOfTier}
              report={reports[group.key]}
              busy={busy}
              typed={typed[group.key] ?? ""}
              onType={(v) => setTyped((t) => ({ ...t, [group.key]: v }))}
              onSend={(mode) => runSend(group, mode)}
              onPreview={openPreview}
              previewLoading={previewLoading}
              onResend={openResend}
            />
          </div>
        );
      })}

      {/* Placed but with no graduation year — she belongs to no class group,
          so she is listed once here rather than disappearing. */}
      {data.noClassYear.length > 0 && (
        <div className={`${CARD} px-5 py-4`}>
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#B45309]">
            No graduation year · {data.noClassYear.length}
          </div>
          <p className="mt-2 text-[13px] text-[#374151]">
            {data.noClassYear.map((a) => a.name).join(", ")} — placed, but with no
            class to send under. Set a graduation year on the roster screen.
          </p>
        </div>
      )}

      {/* ── Nudges ─────────────────────────────────────────────────────── */}
      <div className={`${CARD} p-5`}>
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">
          Reminders
        </div>
        <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[#374151]">
          Sent to anyone still unconfirmed, counted from her own placement email —
          not from a wave date, because groups are approved on different days. A
          family that has confirmed is never nudged. Nothing here is scheduled;
          each round is sent by hand.
        </p>
        <div className="mt-4 flex flex-wrap gap-6">
          {NUDGE_DAYS.map((day) => {
            const key = `nudge${day}`;
            const report = reports[key];
            return (
              <div key={day} className="min-w-[280px] flex-1">
                <div className="text-[13px] font-semibold text-[#0A0A0B]">
                  Day {day}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => runNudge(day, "dry_run")}
                    disabled={busy !== null}
                    className={`${BTN} border border-[#E5E8EC] text-[#374151] hover:bg-[#F8F9FA]`}
                  >
                    {busy === `${key}:dry_run` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Dry run
                  </button>
                  <button
                    onClick={() => runNudge(day, "test")}
                    disabled={busy !== null}
                    className={`${BTN} border border-[#E5E8EC] text-[#374151] hover:bg-[#F8F9FA]`}
                  >
                    {busy === `${key}:test` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Mail className="h-4 w-4" />
                    )}
                    Test to me
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    value={typed[key] ?? ""}
                    onChange={(e) =>
                      setTyped((t) => ({ ...t, [key]: e.target.value }))
                    }
                    placeholder={NUDGE_APPROVAL}
                    className="w-[150px] rounded-lg border border-[#E5E8EC] px-2.5 py-2 font-mono text-[12px] tracking-wide outline-none focus:border-[#4B9CD3]"
                  />
                  <button
                    onClick={() => runNudge(day, "live")}
                    disabled={busy !== null || (typed[key] ?? "") !== NUDGE_APPROVAL}
                    className={`${BTN} bg-[#0A0A0B] text-white hover:bg-[#26272B]`}
                  >
                    {busy === `${key}:live` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send day {day}
                  </button>
                </div>
                {report && <ReportBlock report={report} />}
              </div>
            );
          })}
        </div>
      </div>

      {preview && (
        <PreviewModal
          preview={preview}
          onClose={() => setPreview(null)}
          onTest={testOne}
          testing={busy === "preview:test"}
          sent={sentToMe === preview.athleteKey}
        />
      )}

      {resendFor && (
        <ResendModal
          athlete={resendFor}
          result={resendResult}
          busy={busy}
          cooldownUntil={cooldowns[resendFor.key] ?? 0}
          onSend={(mode, email) => runResend(resendFor, mode, email)}
          onClose={() => {
            setResendFor(null);
            setResendResult(null);
          }}
        />
      )}
    </div>
  );
}

// ── One tier ──────────────────────────────────────────────────────────────

function GroupCard({
  group,
  firstOfTier,
  report,
  busy,
  typed,
  onType,
  onSend,
  onPreview,
  previewLoading,
  onResend,
}: {
  group: SendGroup;
  firstOfTier: boolean;
  report?: SendReport;
  busy: string | null;
  typed: string;
  onType: (v: string) => void;
  onSend: (mode: Mode) => void;
  onPreview: (key: string, tier: SendableTier) => void;
  previewLoading: string | null;
  onResend: (athlete: SendCandidate) => void;
}) {
  const phrase = approvalPhrase(group.tier, group.classKey);
  const canSend = group.ready.length > 0;

  return (
    // The id anchors deep links from /admin/rosters team headers.
    // Two anchors: the precise one ("2030:elite" → "2030-elite") and, on the
    // first group of a tier, the bare tier — /admin/rosters still links to
    // /admin/placements#elite and that link must keep landing somewhere.
    <div
      id={group.key.replace(":", "-")}
      className={`${CARD} overflow-hidden scroll-mt-24`}
    >
      {firstOfTier && <span id={group.tier} className="block scroll-mt-24" />}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E8EC] px-5 py-4">
        <div>
          <div className="text-[15px] font-bold text-[#0A0A0B]">{group.label}</div>
          <div className="mt-0.5 text-[12px] text-[#6B7280]">
            {group.ready.length} ready · {group.alreadySent.length} already sent ·{" "}
            {group.cannotContact.length} cannot be contacted
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onSend("dry_run")}
            disabled={busy !== null || !canSend}
            className={`${BTN} border border-[#E5E8EC] text-[#374151] hover:bg-[#F8F9FA]`}
          >
            {busy === `${group.tier}:dry_run` ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Dry run
          </button>
          <button
            onClick={() => onSend("test")}
            disabled={busy !== null || !canSend}
            className={`${BTN} border border-[#E5E8EC] text-[#374151] hover:bg-[#F8F9FA]`}
          >
            {busy === `${group.tier}:test` ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Test to me
          </button>
          <input
            value={typed}
            onChange={(e) => onType(e.target.value)}
            placeholder={phrase}
            disabled={!canSend}
            className="w-[190px] rounded-lg border border-[#E5E8EC] px-2.5 py-2 font-mono text-[12px] tracking-wide outline-none focus:border-[#4B9CD3] disabled:bg-[#F8F9FA]"
          />
          <button
            onClick={() => onSend("live")}
            disabled={busy !== null || !canSend || typed.trim() !== phrase}
            className={`${BTN} bg-[#0A0A0B] text-white hover:bg-[#26272B]`}
          >
            {busy === `${group.tier}:live` ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Approve &amp; send
          </button>
        </div>
      </div>

      <div className="divide-y divide-[#E5E8EC]">
        <Bucket
          title="Will receive the email"
          tone="ready"
          rows={group.ready}
          empty="Nobody in this group is ready to send."
          onPreview={onPreview}
          previewLoading={previewLoading}
          onResend={onResend}
        />
        {group.cannotContact.length > 0 && (
          <Bucket
            title="Cannot be contacted — being skipped"
            tone="blocked"
            rows={group.cannotContact}
            onPreview={onPreview}
            previewLoading={previewLoading}
            onResend={onResend}
          />
        )}
        {group.alreadySent.length > 0 && (
          <Bucket
            title="Already received it"
            tone="sent"
            rows={group.alreadySent}
            onPreview={onPreview}
            previewLoading={previewLoading}
            onResend={onResend}
          />
        )}
      </div>

      {report && (
        <div className="border-t border-[#E5E8EC] px-5 py-4">
          <ReportBlock report={report} />
        </div>
      )}
    </div>
  );
}

function Bucket({
  title,
  tone,
  rows,
  empty,
  onPreview,
  previewLoading,
  onResend,
}: {
  title: string;
  tone: "ready" | "blocked" | "sent";
  rows: SendCandidate[];
  empty?: string;
  onPreview: (key: string, tier: SendableTier) => void;
  previewLoading: string | null;
  onResend: (athlete: SendCandidate) => void;
}) {
  const dot =
    tone === "ready" ? "#4B9CD3" : tone === "blocked" ? "#F59E0B" : "#9CA3AF";

  return (
    <div className="px-5 py-4">
      <div className="flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: dot }}
          aria-hidden
        />
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6B7280]">
          {title} · {rows.length}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 text-[13px] text-[#9CA3AF]">{empty}</p>
      ) : (
        <table className="mt-3 w-full text-left text-[13px]">
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-[#F0F1F3] first:border-t-0">
                <td className="py-2 pr-3 font-medium text-[#0A0A0B]">{r.name}</td>
                <td className="py-2 pr-3 text-[#6B7280]">{r.placementLabel}</td>
                <td className="py-2 pr-3 text-[#6B7280]">
                  {r.email ?? (
                    <span className="inline-flex items-center gap-1 text-[#B45309]">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      no email on file
                    </span>
                  )}
                  {/* Where the email ACTUALLY went, when that is not the
                      address on file. This is Elizabeth Woll's whole story in
                      one line, and it was invisible before. */}
                  {r.history.lastSentTo &&
                    r.history.lastSentTo !== r.email && (
                      <div className="mt-0.5 text-[11px] text-[#B45309]">
                        went to {r.history.lastSentTo}
                      </div>
                    )}
                </td>
                <td className="py-2 pr-3 text-[#6B7280]">
                  {tone === "blocked" && r.blockedBy ? (
                    SKIP_REASON_LABEL[r.blockedBy]
                  ) : tone === "sent" ? (
                    <SentStatus row={r} />
                  ) : r.greeting ? (
                    // How her email actually opens. A surname typo is visible
                    // here, before the send, instead of in her inbox.
                    <span
                      className={r.parentName ? "" : "text-[#B45309]"}
                      title={
                        r.parentName
                          ? `Parent on file: ${r.parentName}`
                          : "No parent name on file — greeting falls back to the surname"
                      }
                    >
                      {r.greeting}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={() => onPreview(r.key, r.tier)}
                      disabled={previewLoading !== null}
                      className="inline-flex items-center gap-1 rounded-md border border-[#E5E8EC] px-2 py-1 text-[12px] font-semibold text-[#374151] transition hover:bg-[#F8F9FA] disabled:opacity-40"
                    >
                      {previewLoading === r.key ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                      Preview
                    </button>
                    {/* The affordance is SERVER-DECIDED. A family who has
                        confirmed has no resend button — not a disabled one. */}
                    {r.canResend ? (
                      <button
                        onClick={() => onResend(r)}
                        className="inline-flex items-center gap-1 rounded-md border border-[#4B9CD3]/40 bg-[#4B9CD3]/5 px-2 py-1 text-[12px] font-semibold text-[#1F6FA8] transition hover:bg-[#4B9CD3]/10"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                        Resend
                      </button>
                    ) : (
                      // Why there is no button here, rather than a mystery gap.
                      r.sentAt &&
                      r.resendBlockedBy && (
                        <span
                          className="text-[11px] text-[#9CA3AF]"
                          title={RESEND_BLOCK_LABEL[r.resendBlockedBy]}
                        >
                          {r.resendBlockedBy === "confirmed"
                            ? "no resend — confirmed"
                            : "no resend"}
                        </span>
                      )
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/**
 * What became of the email she was sent.
 *
 * 'sent' is reported as ACCEPTED, never as delivered. Resend returns a 2xx the
 * moment it takes the message; delivery is a separate event that arrives
 * minutes later on the webhook. Claiming delivery we have not been told about
 * is how a placement email that landed in a fifteen-year-old's inbox looked
 * fine for four days.
 */
function SentStatus({ row }: { row: SendCandidate }) {
  const { history } = row;
  const latest = history.resends[history.resends.length - 1] ?? history.original;
  const delivery = latest?.delivery ?? null;
  const tone =
    delivery?.status === "bounced" || delivery?.status === "complained"
      ? "text-[#B91C1C]"
      : delivery?.status === "delivered"
        ? "text-[#047857]"
        : "text-[#9CA3AF]";

  return (
    <div className="space-y-0.5">
      <div>
        {row.confirmedAt
          ? `Confirmed ${fmtDate(row.confirmedAt)}`
          : `Sent ${fmtDate(row.sentAt)} · unconfirmed`}
      </div>
      {history.resends.length > 0 && (
        <div className="text-[11px] font-semibold text-[#1F6FA8]">
          Resent{" "}
          {history.resends.length === 1
            ? "once"
            : `${history.resends.length} times`}{" "}
          · {fmtDate(history.lastSentAt)}
        </div>
      )}
      <div className={`text-[11px] ${tone}`}>{deliveryLabel(delivery)}</div>
    </div>
  );
}

// ── What just happened ────────────────────────────────────────────────────

function ReportBlock({ report }: { report: SendReport }) {
  const modeLabel =
    report.mode === "dry_run"
      ? "Dry run — nothing was emailed"
      : report.mode === "test"
        ? "Test — delivered to you only"
        : "Live send";

  return (
    <div className="rounded-xl bg-[#F8F9FA] p-4 text-[13px]">
      <div className="font-semibold text-[#0A0A0B]">{modeLabel}</div>
      {report.refusal && (
        <p className="mt-1 text-[#B91C1C]">{report.refusal}</p>
      )}
      <div className="mt-2 space-y-2">
        {report.sent.length > 0 && (
          <div className="flex gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
            <div className="text-[#374151]">
              <span className="font-semibold">{report.sent.length}</span>{" "}
              {report.mode === "dry_run" ? "would have been sent" : "sent"}:{" "}
              {report.sent.map((s) => s.name).join(", ")}
            </div>
          </div>
        )}
        {report.failed.length > 0 && (
          <div className="flex gap-2">
            <X className="mt-0.5 h-4 w-4 shrink-0 text-[#EF4444]" />
            <div className="text-[#B91C1C]">
              {report.failed
                .map((f) => `${f.name} — ${f.error ?? "failed"}`)
                .join("; ")}
            </div>
          </div>
        )}
        {report.skipped.length > 0 && (
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" />
            <div className="text-[#92400E]">
              Skipped:{" "}
              {report.skipped.map((s) => `${s.name} — ${s.detail}`).join("; ")}
            </div>
          </div>
        )}
        {report.sent.length === 0 &&
          report.failed.length === 0 &&
          report.skipped.length === 0 && (
            <div className="text-[#6B7280]">Nobody matched this run.</div>
          )}
      </div>
    </div>
  );
}

// ── Send it again, to the right place ─────────────────────────────────────

/**
 * One family, one email, one screen.
 *
 * The address lives in the same motion as the send because the address is
 * almost always what was wrong — asking the operator to go and fix a record on
 * another screen first is how a resend does not get sent.
 */
function ResendModal({
  athlete,
  result,
  busy,
  cooldownUntil,
  onSend,
  onClose,
}: {
  athlete: SendCandidate;
  result: ResendResult | null;
  busy: string | null;
  cooldownUntil: number;
  onSend: (mode: "test" | "live", email: string) => void;
  onClose: () => void;
}) {
  const onFile = athlete.email ?? athlete.history.lastSentTo ?? "";
  const [email, setEmail] = useState(onFile);
  const [armed, setArmed] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Tick only while a cooldown is actually running.
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, [cooldownUntil]);

  const cooling = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const trimmed = email.trim();
  const corrected = trimmed.toLowerCase() !== onFile.toLowerCase();
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  const testing = busy === `resend:${athlete.key}:test`;
  const sending = busy === `resend:${athlete.key}:live`;
  const locked = busy !== null || cooling > 0;

  const events: SendEvent[] = [
    ...(athlete.history.original ? [athlete.history.original] : []),
    ...athlete.history.resends,
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 md:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E5E8EC] px-5 py-4">
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-[#0A0A0B]">
              Resend to {athlete.name}&apos;s family
            </div>
            <div className="mt-0.5 truncate text-[12px] text-[#6B7280]">
              {athlete.placementLabel}
              {athlete.parentName ? ` · ${athlete.parentName}` : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#6B7280] transition hover:bg-[#F8F9FA]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── What has already gone out ───────────────────────────────── */}
        <div className="border-b border-[#E5E8EC] px-5 py-4">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF]">
            History
          </div>
          <ol className="mt-3 space-y-2.5">
            {events.length === 0 && (
              <li className="text-[13px] text-[#9CA3AF]">
                No placement email on record.
              </li>
            )}
            {events.map((e, i) => (
              <li key={`${e.at}-${i}`} className="flex gap-2.5 text-[13px]">
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: e.kind === "resend" ? "#4B9CD3" : "#9CA3AF" }}
                  aria-hidden
                />
                <div className="min-w-0">
                  <div className="text-[#0A0A0B]">
                    <span className="font-semibold">
                      {e.kind === "resend" ? "Resent" : "Sent"}
                    </span>{" "}
                    {fmtDateTime(e.at)} → <span className="break-all">{e.to}</span>
                  </div>
                  <div className="text-[12px] text-[#6B7280]">
                    {deliveryLabel(e.delivery)}
                    {e.status === "failed" && " · send failed"}
                    {e.status === "claimed" && " · never resolved — check the log"}
                    {e.by ? ` · by ${e.by}` : ""}
                  </div>
                  {e.delivery?.bounceMessage && (
                    <div className="mt-0.5 text-[12px] text-[#B91C1C]">
                      {e.delivery.bounceMessage}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* ── Where it goes this time ─────────────────────────────────── */}
        <div className="px-5 py-4">
          <label
            htmlFor="resend-to"
            className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9CA3AF]"
          >
            Send to
          </label>
          <input
            id="resend-to"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setArmed(false);
            }}
            spellCheck={false}
            autoComplete="off"
            className="mt-2 w-full rounded-lg border border-[#E5E8EC] px-3 py-2.5 text-[14px] outline-none focus:border-[#4B9CD3]"
          />
          {corrected && valid && (
            <p className="mt-2 text-[12px] leading-relaxed text-[#1F6FA8]">
              This also corrects her address on file, so the reminder and every
              later email go here too — not just this one.
            </p>
          )}
          {trimmed && !valid && (
            <p className="mt-2 text-[12px] text-[#B91C1C]">
              That is not a valid email address.
            </p>
          )}
        </div>

        {/* ── The two ways to send ────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E8EC] px-5 py-4">
          <button
            onClick={() => onSend("test", trimmed)}
            disabled={!valid || busy !== null}
            className={`${BTN} border border-[#E5E8EC] text-[#374151] hover:bg-[#F8F9FA]`}
            title="Sends exactly this email to your own address"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Send this to me
          </button>

          {/* Two steps, and the confirm button is not where the first one was —
              a stray double-click arms and then lands on empty space. */}
          {!armed ? (
            <button
              onClick={() => setArmed(true)}
              disabled={!valid || locked}
              className={`${BTN} bg-[#0A0A0B] text-white hover:bg-[#26272B]`}
            >
              <Send className="h-4 w-4" />
              {cooling > 0 ? `Wait ${cooling}s` : "Resend to the family"}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setArmed(false);
                  onSend("live", trimmed);
                }}
                disabled={locked}
                className={`${BTN} bg-[#B91C1C] text-white hover:bg-[#991B1B]`}
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send to {trimmed}
              </button>
              <button
                onClick={() => setArmed(false)}
                disabled={busy !== null}
                className={`${BTN} border border-[#E5E8EC] text-[#374151] hover:bg-[#F8F9FA]`}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {result && (
          <div className="border-t border-[#E5E8EC] px-5 py-4">
            {result.ok ? (
              <div className="flex gap-2 text-[13px]">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#10B981]" />
                <div className="text-[#374151]">
                  <div>
                    Sent to <span className="font-semibold">{result.to}</span>
                    {result.attempt ? ` · resend #${result.attempt}` : ""}
                  </div>
                  {result.correction && (
                    <div className="mt-1 text-[12px] text-[#6B7280]">
                      Address updated on {result.correction.label}
                      {result.correction.alsoAffects.length > 0 && (
                        <> — this also changes it for {result.correction.alsoAffects.join(", ")}</>
                      )}
                      .
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex gap-2 text-[13px]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#F59E0B]" />
                <div className="text-[#92400E]">
                  <div>{result.error ?? "Nothing was sent."}</div>
                  {/* The correction is saved before the send. If the send then
                      failed, she still needs to know the address stuck — or
                      she will type it again and wonder why nothing changed. */}
                  {result.correction && (
                    <div className="mt-1 text-[12px] text-[#6B7280]">
                      Her address was still updated to{" "}
                      <span className="font-semibold">{result.correction.to}</span>{" "}
                      on {result.correction.label}. Nothing was emailed.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Full rendered preview ─────────────────────────────────────────────────

function PreviewModal({
  preview,
  onClose,
  onTest,
  testing,
  sent,
}: {
  preview: Preview;
  onClose: () => void;
  onTest: (athleteKey: string, tier: SendableTier) => void;
  testing: boolean;
  sent: boolean;
}) {
  const [tab, setTab] = useState<"html" | "text">("html");

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 md:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[720px] rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#E5E8EC] px-5 py-4">
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-[#0A0A0B]">
              {preview.name}
            </div>
            <div className="mt-0.5 truncate text-[12px] text-[#6B7280]">
              {preview.placementLabel} · {preview.email ?? "no email on file"}
            </div>
            {preview.subject && (
              <div className="mt-2 text-[13px] text-[#374151]">
                <span className="font-semibold">Subject:</span> {preview.subject}
              </div>
            )}
            {preview.confirmUrl && (
              <div className="mt-1 break-all font-mono text-[11px] text-[#9CA3AF]">
                {preview.confirmUrl}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {/* One email, this athlete, to you — not the whole group. */}
            {!preview.blocked && preview.athleteKey && preview.tier && (
              <button
                onClick={() => onTest(preview.athleteKey!, preview.tier!)}
                disabled={testing || sent}
                className={`${BTN} border border-[#E5E8EC] text-[#374151] hover:bg-[#F8F9FA]`}
                title="Sends exactly this email to your own address"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : sent ? (
                  <Check className="h-4 w-4 text-[#10B981]" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                {sent ? "Sent to you" : "Send this to me"}
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#6B7280] transition hover:bg-[#F8F9FA]"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {preview.blocked ? (
          <div className="p-5">
            <div className="rounded-xl border border-[#F59E0B]/40 bg-[#FFFBEB] p-4">
              <div className="flex gap-2">
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#B45309]" />
                <div>
                  <div className="text-[14px] font-bold text-[#92400E]">
                    This email cannot be sent
                  </div>
                  <p className="mt-1 text-[13px] text-[#92400E]/90">
                    {preview.blocked.detail}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-1 border-b border-[#E5E8EC] px-5 pt-3">
              {(["html", "text"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-t-lg px-3 py-2 text-[13px] font-semibold transition ${
                    tab === t
                      ? "bg-[#F8F9FA] text-[#0A0A0B]"
                      : "text-[#6B7280] hover:text-[#0A0A0B]"
                  }`}
                >
                  {t === "html" ? "Rendered" : "Plain text"}
                </button>
              ))}
            </div>
            <div className="bg-[#F8F9FA] p-4">
              {tab === "html" ? (
                <iframe
                  title={`${preview.name} — placement email`}
                  srcDoc={preview.html}
                  sandbox=""
                  className="h-[640px] w-full rounded-lg border border-[#E5E8EC] bg-white"
                />
              ) : (
                <pre className="h-[640px] overflow-auto whitespace-pre-wrap rounded-lg border border-[#E5E8EC] bg-white p-4 font-mono text-[12px] leading-relaxed text-[#374151]">
                  {preview.text}
                </pre>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
