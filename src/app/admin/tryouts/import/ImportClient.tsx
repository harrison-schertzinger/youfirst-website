"use client";

import { useRef, useState, type ChangeEvent } from "react";
import type { ImportPlan } from "@/lib/tryouts/fieldResults";

// Paste-or-upload → preview → confirm. The server recomputes the plan from the
// raw payload on confirm — this component never sends its rendered preview back.

type Phase = "input" | "previewing" | "previewed" | "committing" | "done";

interface CommitResult {
  ok: boolean;
  applied: { updated: number; created: number; merged: number };
  errors: string[];
}

const card = "rounded-2xl border border-[#E5E8EC] bg-white p-5";
const errCard =
  "rounded-2xl border border-[#EF4444]/30 bg-[#EF4444]/5 p-5 text-sm text-[#B91C1C]";

export default function ImportClient() {
  const [phase, setPhase] = useState<Phase>("input");
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);
  const payloadRef = useRef<unknown>(null);

  function reset() {
    setPhase("input");
    setRawText("");
    setFileName(null);
    setError(null);
    setMigrationRequired(false);
    setPlan(null);
    setResult(null);
    payloadRef.current = null;
  }

  async function requestPreview(text: string) {
    setError(null);
    setMigrationRequired(false);
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      setError(
        "That isn't valid JSON. Make sure you uploaded or pasted the whole results file, exactly as exported.",
      );
      return;
    }
    payloadRef.current = payload;
    setPhase("previewing");
    try {
      const res = await fetch("/api/admin/tryouts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        plan?: ImportPlan;
        error?: string;
        migrationRequired?: boolean;
      };
      if (!res.ok || !json.plan) {
        setMigrationRequired(json.migrationRequired === true);
        setError(json.error ?? "Preview failed.");
        setPhase("input");
        return;
      }
      setPlan(json.plan);
      setPhase("previewed");
    } catch {
      setError("Couldn't reach the server — are you back on wifi?");
      setPhase("input");
    }
  }

  async function commit() {
    if (!payloadRef.current) return;
    setPhase("committing");
    setError(null);
    try {
      const res = await fetch("/api/admin/tryouts/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: payloadRef.current, confirm: true }),
      });
      const json = (await res.json()) as CommitResult & {
        error?: string;
        migrationRequired?: boolean;
      };
      if (!res.ok || !json.applied) {
        setMigrationRequired(json.migrationRequired === true);
        setError(json.error ?? "Import failed — nothing may have been written.");
        setPhase("previewed");
        return;
      }
      setResult(json);
      setPhase("done");
    } catch {
      setError("Couldn't reach the server. The import may not have run — preview again to see current state.");
      setPhase("previewed");
    }
  }

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setRawText(text);
      void requestPreview(text);
    };
    reader.readAsText(f);
    e.target.value = "";
  }

  const actionable = plan
    ? plan.summary.updates + plan.summary.creates + plan.summary.merges
    : 0;

  return (
    <div className="space-y-6">
      {error && (
        <div className={errCard}>
          <p className="font-semibold">{migrationRequired ? "Migration required" : "Problem"}</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {(phase === "input" || phase === "previewing") && (
        <div className={card}>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">
              Results file
            </span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={onFile}
              disabled={phase === "previewing"}
              className="mt-2 block w-full text-sm text-[#6B7280] file:mr-4 file:rounded-xl file:border-0 file:bg-[#0B0E12] file:px-4 file:py-2.5 file:text-[13px] file:font-semibold file:text-white hover:file:bg-[#1c2027] file:cursor-pointer"
            />
          </label>
          {fileName && (
            <p className="mt-2 text-[12px] text-[#6B7280]">Selected: {fileName}</p>
          )}
          <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">
            <span className="h-px flex-1 bg-[#E5E8EC]" />
            or paste the export text
            <span className="h-px flex-1 bg-[#E5E8EC]" />
          </div>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={6}
            placeholder='{"kind":"yf-tryout-field-results", …}'
            className="w-full rounded-xl border border-[#D6DBE1] p-3 font-mono text-[12px] text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#4A90D9]"
          />
          <button
            type="button"
            onClick={() => void requestPreview(rawText)}
            disabled={phase === "previewing" || rawText.trim().length === 0}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#4A90D9] px-5 py-2.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-white hover:bg-[#3D87BC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {phase === "previewing" ? "Building preview…" : "Preview import"}
          </button>
        </div>
      )}

      {plan && (phase === "previewed" || phase === "committing" || phase === "done") && (
        <>
          {/* Summary */}
          <div className={card}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF] mb-3">
              {phase === "done" ? "What was imported" : "What will happen"}
            </p>
            <div className="flex flex-wrap gap-2 text-[12px] font-semibold">
              <span className="inline-flex items-center rounded-full bg-[#E8F5EE] px-3 py-1.5 text-[#177245]">
                {plan.summary.updates} check-in/note update{plan.summary.updates === 1 ? "" : "s"}
              </span>
              <span className="inline-flex items-center rounded-full bg-accent-wash px-3 py-1.5 text-accent-blue-hover">
                {plan.summary.creates} new walk-up{plan.summary.creates === 1 ? "" : "s"}
              </span>
              {plan.summary.merges > 0 && (
                <span className="inline-flex items-center rounded-full bg-[#FEF3C7] px-3 py-1.5 text-[#92400E]">
                  {plan.summary.merges} walk-up{plan.summary.merges === 1 ? "" : "s"} matched to existing registrants
                </span>
              )}
              <span className="inline-flex items-center rounded-full bg-[#F1F3F6] px-3 py-1.5 text-[#6B7280]">
                {plan.summary.unchanged} unchanged
              </span>
              {plan.summary.alreadyImported > 0 && (
                <span className="inline-flex items-center rounded-full bg-[#F1F3F6] px-3 py-1.5 text-[#6B7280]">
                  {plan.summary.alreadyImported} already imported
                </span>
              )}
              {(plan.summary.notFound > 0 || plan.summary.invalid > 0) && (
                <span className="inline-flex items-center rounded-full bg-[#EF4444]/10 px-3 py-1.5 text-[#B91C1C]">
                  {plan.summary.notFound + plan.summary.invalid} skipped
                </span>
              )}
            </div>
            <p className="mt-3 text-[12px] text-[#9CA3AF]">
              Sheet generated {new Date(plan.sheetGeneratedAt).toLocaleString("en-US", { timeZone: "America/New_York" })} ET
              · exported {new Date(plan.exportedAt).toLocaleString("en-US", { timeZone: "America/New_York" })} ET.
              Imports never un-check anyone and never delete anything.
            </p>
          </div>

          {/* Registrant updates */}
          {plan.registrants.some((r) => r.action === "update") && (
            <div className={card}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF] mb-3">
                Existing registrants — will update
              </p>
              <ul className="divide-y divide-[#F1F3F6]">
                {plan.registrants
                  .filter((r) => r.action === "update")
                  .map((r) => (
                    <li key={r.id} className="flex flex-wrap items-baseline gap-x-3 py-2.5">
                      <span className="font-semibold text-sm text-[#1A1A1A]">{r.name}</span>
                      <span className="text-[13px] text-[#6B7280]">{r.changes.join(" · ")}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Walk-ups */}
          {plan.walkUps.length > 0 && (
            <div className={card}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF] mb-3">
                Walk-ups
              </p>
              <ul className="divide-y divide-[#F1F3F6]">
                {plan.walkUps.map((w) => (
                  <li key={w.uid} className="py-2.5">
                    <div className="flex flex-wrap items-baseline gap-x-3">
                      <span className="font-semibold text-sm text-[#1A1A1A]">{w.name}</span>
                      {w.gradYear && (
                        <span className="text-[13px] text-[#6B7280]">Class of {w.gradYear}</span>
                      )}
                      {w.action === "create" && (
                        <span className="inline-flex items-center rounded-full bg-accent-wash px-2.5 py-0.5 text-[11px] font-semibold text-accent-blue-hover">
                          New record
                        </span>
                      )}
                      {w.action === "merge" && (
                        <span className="inline-flex items-center rounded-full bg-[#FEF3C7] px-2.5 py-0.5 text-[11px] font-semibold text-[#92400E]">
                          Matches existing — no duplicate
                        </span>
                      )}
                      {w.action === "already-imported" && (
                        <span className="inline-flex items-center rounded-full bg-[#F1F3F6] px-2.5 py-0.5 text-[11px] font-semibold text-[#6B7280]">
                          Already imported
                        </span>
                      )}
                      {w.action === "invalid" && (
                        <span className="inline-flex items-center rounded-full bg-[#EF4444]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[#B91C1C]">
                          Skipped
                        </span>
                      )}
                    </div>
                    {(w.changes.length > 0 || w.reason) && (
                      <p className="mt-0.5 text-[13px] text-[#6B7280]">
                        {[...w.changes, w.reason].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Skipped registrants */}
          {plan.registrants.some((r) => r.action === "not-found") && (
            <div className={errCard}>
              <p className="font-semibold">Not found in the database</p>
              <p className="mt-1">
                {plan.registrants
                  .filter((r) => r.action === "not-found")
                  .map((r) => r.name)
                  .join(", ")}{" "}
                — these rows were on the sheet but no longer match a registration. Nothing will be
                written for them.
              </p>
            </div>
          )}

          {/* Confirm / result */}
          {phase !== "done" ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void commit()}
                disabled={phase === "committing" || actionable === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-[#0B0E12] px-6 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-white hover:bg-[#1c2027] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {phase === "committing"
                  ? "Importing…"
                  : `Confirm import (${actionable} change${actionable === 1 ? "" : "s"})`}
              </button>
              {actionable === 0 && (
                <span className="text-sm text-[#6B7280]">
                  Nothing to import — everything in this file is already in the database.
                </span>
              )}
              <button
                type="button"
                onClick={reset}
                className="text-[13px] font-semibold text-[#6B7280] hover:text-[#1A1A1A]"
              >
                Start over
              </button>
            </div>
          ) : (
            result && (
              <div className={result.ok ? card : errCard}>
                <p className="text-sm font-semibold text-[#1A1A1A]">
                  {result.ok ? "Import complete." : "Import finished with problems."}
                </p>
                <p className="mt-1 text-sm text-[#6B7280]">
                  {result.applied.updated} updated · {result.applied.created} created ·{" "}
                  {result.applied.merged} merged into existing rows.
                </p>
                {result.errors.length > 0 && (
                  <ul className="mt-2 list-disc pl-5 text-sm text-[#B91C1C]">
                    {result.errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={reset}
                  className="mt-4 inline-flex items-center rounded-xl bg-[#4A90D9] px-5 py-2.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-white hover:bg-[#3D87BC] transition-colors"
                >
                  Import another file
                </button>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
