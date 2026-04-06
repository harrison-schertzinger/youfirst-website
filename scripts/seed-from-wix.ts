/**
 * seed-from-wix.ts
 * ─────────────────
 * Imports guardian and payment data from Wix CSV exports into Supabase.
 *
 * Usage:
 *   npx tsx scripts/seed-from-wix.ts
 *
 * Reads:
 *   ~/youfirst-wix-migration/output/wix-contacts-clean.csv
 *   ~/youfirst-wix-migration/output/wix-orders-all.csv
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
import { homedir } from "os";

// ── Config ──────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing env vars. Run with:\n  npx dotenv -e .env.local -- tsx scripts/seed-from-wix.ts"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── CSV Parser (simple, no external deps) ───────────────
function parseCSV(raw: string): Record<string, string>[] {
  const lines = raw.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h.trim()] = (values[i] || "").trim()));
    return row;
  });
}

function parseLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

// ── Main ────────────────────────────────────────────────
async function main() {
  const wixDir = resolve(homedir(), "youfirst-wix-migration/output");

  console.log("Reading CSV files...");
  const contactsRaw = readFileSync(resolve(wixDir, "wix-contacts-clean.csv"), "utf-8");
  const ordersRaw = readFileSync(resolve(wixDir, "wix-orders-all.csv"), "utf-8");

  const contacts = parseCSV(contactsRaw);
  const orders = parseCSV(ordersRaw);

  console.log(`  Contacts: ${contacts.length}`);
  console.log(`  Orders: ${orders.length}`);

  // ── Seed Guardians ──────────────────────────────────
  let guardiansCreated = 0;
  let guardiansSkipped = 0;
  const emailToGuardianId = new Map<string, string>();

  for (const c of contacts) {
    const email = (c["Email"] || "").toLowerCase().trim();
    if (!email) {
      guardiansSkipped++;
      continue;
    }

    // Skip duplicates within the CSV
    if (emailToGuardianId.has(email)) continue;

    const firstName = c["First Name"] || "Parent";
    const lastName = c["Last Name"] || "";

    // Upsert — if email already exists, get the ID
    const { data, error } = await supabase
      .from("guardians")
      .upsert(
        {
          email,
          first_name: firstName,
          last_name: lastName,
          phone: c["Phone"] || null,
        },
        { onConflict: "email" }
      )
      .select("id")
      .single();

    if (error) {
      console.error(`  ✗ Guardian "${email}": ${error.message}`);
      guardiansSkipped++;
      continue;
    }

    emailToGuardianId.set(email, data.id);
    guardiansCreated++;
  }

  console.log(`\nGuardians: ${guardiansCreated} created/updated, ${guardiansSkipped} skipped`);

  // ── Seed Payments ───────────────────────────────────
  let paymentsCreated = 0;
  let paymentsSkipped = 0;

  for (const o of orders) {
    const email = (o["Buyer Email"] || "").toLowerCase().trim();
    if (!email) {
      paymentsSkipped++;
      continue;
    }

    // Find or create guardian for this buyer
    let guardianId = emailToGuardianId.get(email);
    if (!guardianId) {
      const { data, error } = await supabase
        .from("guardians")
        .upsert(
          {
            email,
            first_name: o["Buyer First Name"] || "Parent",
            last_name: o["Buyer Last Name"] || "",
            phone: o["Buyer Phone"] || null,
          },
          { onConflict: "email" }
        )
        .select("id")
        .single();

      if (error) {
        console.error(`  ✗ Order guardian "${email}": ${error.message}`);
        paymentsSkipped++;
        continue;
      }
      guardianId = data!.id;
      emailToGuardianId.set(email, guardianId!);
    }

    // Parse amount — CSV has dollars, we store cents
    const totalDollars = parseFloat(o["Total"] || "0");
    const amountCents = Math.round(totalDollars * 100);
    if (amountCents <= 0) {
      paymentsSkipped++;
      continue;
    }

    // Determine payment method
    const rawMethod = (o["Payment Method"] || "").toLowerCase();
    let paymentMethod = "wix_historical";
    if (rawMethod.includes("apple")) paymentMethod = "stripe";
    else if (rawMethod.includes("credit") || rawMethod.includes("debit"))
      paymentMethod = "stripe";
    else if (rawMethod.includes("check")) paymentMethod = "check";
    else if (rawMethod.includes("cash")) paymentMethod = "cash";

    // Payment status
    const rawStatus = (o["Payment Status"] || "").toUpperCase();
    const status = rawStatus === "PAID" ? "completed" : "pending";

    const { error } = await supabase.from("payments").insert({
      // No player_id yet — these will be linked manually when players are created
      // For now, use guardian_id to track who paid
      player_id: "00000000-0000-0000-0000-000000000000", // placeholder
      guardian_id: guardianId,
      amount_cents: amountCents,
      payment_method: paymentMethod,
      description: o["Line Items"] || null,
      payment_date: o["Date Created"] || new Date().toISOString(),
      season: deriveSeason(o["Date Created"]),
      status,
    });

    if (error) {
      console.error(`  ✗ Payment for "${email}": ${error.message}`);
      paymentsSkipped++;
      continue;
    }

    paymentsCreated++;
  }

  console.log(`Payments: ${paymentsCreated} created, ${paymentsSkipped} skipped`);
  console.log(`\n✓ Seeding complete.`);
  console.log(`  Total guardians in DB: ${emailToGuardianId.size}`);
  console.log(
    `  Note: Payments reference a placeholder player_id. Link them to real players after creating player records.`
  );
}

function deriveSeason(dateStr: string): string {
  if (!dateStr) return "Unknown";
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth();
  // Season runs roughly June–March
  if (month >= 5) return `${year}-${year + 1}`;
  return `${year - 1}-${year}`;
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
