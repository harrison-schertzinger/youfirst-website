"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Eye,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  approvalPhrase,
  NUDGE_APPROVAL,
  NUDGE_DAYS,
  SKIP_REASON_LABEL,
  type SendAudience,
  type SendCandidate,
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
  name: string;
  email: string | null;
  placementLabel: string;
  subject?: string;
  html?: string;
  text?: string;
  confirmUrl?: string;
  blocked?: { reason: string; detail: string };
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

export default function PlacementsClient({ initial }: { initial: SendAudience }) {
  const [data, setData] = useState<SendAudience>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [reports, setReports] = useState<Record<string, SendReport>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [typed, setTyped] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/placements", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Refresh failed.");
      setData(json as SendAudience);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const openPreview = useCallback(async (athleteKey: string) => {
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
      setPreview(json as Preview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Preview failed.");
    } finally {
      setPreviewLoading(null);
    }
  }, []);

  const runSend = useCallback(
    async (tier: SendableTier, mode: Mode) => {
      const busyKey = `${tier}:${mode}`;
      setBusy(busyKey);
      setError(null);
      try {
        const res = await fetch("/api/admin/placements/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tier,
            mode,
            confirmation: mode === "live" ? (typed[tier] ?? "") : undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Send failed.");
        setReports((r) => ({ ...r, [tier]: json as SendReport }));
        if (mode === "live") {
          setTyped((t) => ({ ...t, [tier]: "" }));
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
        (t) => !t.found || t.unwritten.length > 0 || t.missingRegions.length > 0,
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
                A template still carrying a{" "}
                <code className="rounded bg-[#92400E]/10 px-1">[[ ]]</code> block is
                blocked at every level: preview, test and live. Edit the copy in{" "}
                <a href="/admin/templates" className="underline">
                  Templates
                </a>{" "}
                and delete each block.
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

      {/* ── Groups ─────────────────────────────────────────────────────── */}
      {data.groups.map((group) => (
        <GroupCard
          key={group.tier}
          group={group}
          report={reports[group.tier]}
          busy={busy}
          typed={typed[group.tier] ?? ""}
          onType={(v) => setTyped((t) => ({ ...t, [group.tier]: v }))}
          onSend={(mode) => runSend(group.tier, mode)}
          onPreview={openPreview}
          previewLoading={previewLoading}
        />
      ))}

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
        <PreviewModal preview={preview} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}

// ── One tier ──────────────────────────────────────────────────────────────

function GroupCard({
  group,
  report,
  busy,
  typed,
  onType,
  onSend,
  onPreview,
  previewLoading,
}: {
  group: SendGroup;
  report?: SendReport;
  busy: string | null;
  typed: string;
  onType: (v: string) => void;
  onSend: (mode: Mode) => void;
  onPreview: (key: string) => void;
  previewLoading: string | null;
}) {
  const phrase = approvalPhrase(group.tier);
  const canSend = group.ready.length > 0;

  return (
    <div className={`${CARD} overflow-hidden`}>
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
        />
        {group.cannotContact.length > 0 && (
          <Bucket
            title="Cannot be contacted — being skipped"
            tone="blocked"
            rows={group.cannotContact}
            onPreview={onPreview}
            previewLoading={previewLoading}
          />
        )}
        {group.alreadySent.length > 0 && (
          <Bucket
            title="Already received it"
            tone="sent"
            rows={group.alreadySent}
            onPreview={onPreview}
            previewLoading={previewLoading}
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
}: {
  title: string;
  tone: "ready" | "blocked" | "sent";
  rows: SendCandidate[];
  empty?: string;
  onPreview: (key: string) => void;
  previewLoading: string | null;
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
                </td>
                <td className="py-2 pr-3 text-[#6B7280]">
                  {tone === "blocked" && r.blockedBy
                    ? SKIP_REASON_LABEL[r.blockedBy]
                    : tone === "sent"
                      ? r.confirmedAt
                        ? `Confirmed ${fmtDate(r.confirmedAt)}`
                        : `Sent ${fmtDate(r.sentAt)} · unconfirmed`
                      : (r.parentName ?? "—")}
                </td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => onPreview(r.key)}
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
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

// ── Full rendered preview ─────────────────────────────────────────────────

function PreviewModal({
  preview,
  onClose,
}: {
  preview: Preview;
  onClose: () => void;
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
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#6B7280] transition hover:bg-[#F8F9FA]"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
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
