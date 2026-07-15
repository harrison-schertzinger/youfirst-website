/**
 * One-time import from the legacy "You. First Team Rosters" Google Sheet
 * (read 2026-07-15). Run: npx tsx scripts/import-legacy-roster.ts
 *
 * Law: fill NULLS only — never overwrite a non-null DB value. guardians is
 * contact truth; the curated "2029 and 2030 Team Roster" tab fills its phone
 * gaps by parent-NAME match. Everything printed; idempotent (re-run = no-ops).
 * The legacy Sheet itself is never written to.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { serviceClient, normName } from "../src/lib/command-sheet/data";

function phone(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return null;
}

// Sheet name → DB name where spellings differ.
const ALIASES: Record<string, string> = {
  "camile cannon": "camille cannon",
  "beckett shultz": "bex shultz",
  "gigi crocus": "gigi croucus",
  "stella staubel": "stella straubel",
  "mia leitzow": "mia lietzow",
  "hannah zakem": "hannah zekem",
  "elle swartz": "elise swartz",
  "charlotte anne": "charlotte anne gosdin",
  "caylee": "caylee singleton",
  "maggie b": "maggie boord",
  "lyla": "lyla kahn",
  "reese": "reese brenkert",
  "emeline": "emeline burkhardt",
  "skylar": "skylar mardis",
  "natalie": "natalie klaber",
  "mia leitzo": "mia lietzow",
  "gabbie": "gabbie diaz",
  "ainsley": "ainsley blair",
  "abi": "abi florea",
};

// ── Curated "2029 and 2030 Team Roster" tab ───────────────────────────────
// name · school · [parentName, cell][] (Shannan Schnittger's cell was "S" — dropped)
const CURATED: Array<[string, string, Array<[string, string]>]> = [
  ["Shay Quinn", "Mariemont", [["Natalie Quinn", "513-295-1622"], ["Kyle Quinn", "513-600-0275"]]],
  ["Maggie Boord", "Sycamore", [["Mara Boord", "513-900-7273"], ["Steve Boord", "415-378-5353"]]],
  ["Kamden McCane", "Randall Cooper", [["Kayla Gibby", "859-866-7310"], ["Owen Gibby", "513-266-5567"], ["Kelly McCane", "859-743-4760"], ["Ameara McCane", "513-680-9674"]]],
  ["Parker Murray", "Madiera", [["Pat Murray", "513-378-9525"], ["Kelly Murray", "513-703-9179"]]],
  ["Rowan Feheley", "", []],
  ["Wren Peters", "Mariemont", [["Rachel Peters", "513-259-7664"]]],
  ["Camile Cannon", "Indian Hill", [["Jessica Cannon", "513-600-9789"], ["Kris Cannon", "513-256-6768"]]],
  ["Hannah Zakem", "Sycamore", [["Ginny Zakem", "513-833-5600"], ["Adam Zakem", "513-600-2844"]]],
  ["Beckett Shultz", "Kings", [["Jennifer Shultz", "513-652-7016"], ["Mark Shultz", "513-907-8094"]]],
  ["Demaree Vianello", "Mariemont", [["Brandy Vianello", "513-266-0597"], ["Brian Vianello", "513-349-7996"]]],
  ["Annabel Dawes", "Loveland", [["Chris Dawes", "513-833-1223"], ["Catherine Dawes", "419-206-7009"]]],
  ["Grace Hartwell", "Springboro", [["Kim Hartwell", "937-361-2883"], ["Shane Hartwell", "937-361-8176"]]],
  ["Harper Thornicroft", "Sycamore", [["Todd Thornicroft", "216-406-3733"], ["Marcy Thornicroft", "330-265-6369"]]],
  ["Charlotte Close", "Loveland", [["Jessica Close", "540-220-7661"], ["Tom Close", "401-954-2205"]]],
  ["Evie Flora", "Lakota East", [["Amy Flora", "931-237-7145"], ["Matt Flora", "719-602-9060"]]],
  ["Audrey Noah", "Nagel", [["Mindy Noah", "513-227-8460"], ["Randy Noah", "513-907-7483"]]],
  ["Kate Eickmann", "Indian Hill", []],
  ["Malin Suver", "Oakwood", [["Ben Suver", "937-901-5899"], ["Natalie Godzik", "937-654-7989"]]],
  ["Norah Berning", "Mariemont", [["Maria Berning", "513-373-9134"], ["Jack Berning", "513-280-0424"]]],
  ["Caylee Singleton", "Springboro", [["Jeff Singleton", "502-298-3375"], ["Tiffany Singleton", "502-876-3377"]]],
  ["Maggie Schnittger", "Myers Park, Charlotte, NC", [["Jason Schnittger", "210-836-6633"]]],
  ["Brooke Hagen", "Sycamore", [["James Hagen", "513-833-7699"], ["Jill Hagen", "513-295-1515"]]],
  ["Gigi Crocus", "Lakota", [["Ashley Crocus", "630-730-4352"], ["Ryan Crocus", "301-356-6949"]]],
  ["AC Downs", "Mariemont", [["Sarah Downs", "513-509-7116"], ["David Downs", "513-509-6832"]]],
  ["Bri VanVleet", "Mariemont", []],
  ["Rory Byer", "Indian Hill", [["Jennifer Byer", "513-240-3435"], ["Burke Byer", "513-509-7949"]]],
  ["Charlotte Anne Gosdin", "Indian Hill", [["Rachael Gosdin", "513-846-8257"], ["Craig Gosdin", "513-846-8256"]]],
  ["Elle Swartz", "Lebanon", [["Chris Swartz", "513-470-3438"], ["Aleda Swartz", "513-704-8162"]]],
];

// ── Sheet1 one-email-per-girl (fallback layer; zero strikethrough found in
// the xlsx export, so every import is status 'ok'). Greta VonAllmen's row
// email is Reese Brenkert's second address typed one row down — EXCLUDED. ──
const FALLBACK_EMAILS: Array<[string, string]> = [
  ["Parker Murray", "murraykellym@gmail.com"], ["Rowan Feheley", "bfeheley@gmail.com"],
  ["Wren Peters", "rachel@clean-age.com"], ["Camile Cannon", "cannon5188@gmail.com"],
  ["Hannah Zakem", "gncampbell@gmail.com"], ["Beckett Shultz", "mbwolvs@aol.com"],
  ["Harper Thornicroft", "toddthornicroft@gmail.com"], ["Charlotte Close", "closejess@gmail.com"],
  ["Audrey Noah", "mindybnoah@gmail.com"], ["Kate Eickmann", "kevin@thinkwareinc.com"],
  ["Evie Flora", "amy.m.flora@gmail.com"], ["Malin Suver", "bsuver@woh.rr.com"],
  ["Brooke Hagen", "jillhagen11@gmail.com"], ["Gigi Crocus", "ashleycrocus@gmail.com"],
  ["AC Downs", "dhdowns@yahoo.com"], ["Bri VanVleet", "vanvleetsusan@gmail.com"],
  ["Rory Byer", "jenbyer@yahoo.com"], ["Elle Swartz", "cswartz17@yahoo.com"],
  ["Shay Quinn", "kquinn0275@gmail.com"], ["Grace Hartwell", "kdhartwell4@gmail.com"],
  ["Kamden McCane", "kay.kayla@gmail.com"], ["Norah Berning", "jack.berning@gmail.com"],
  ["Caylee Singleton", "jeffandtiffanys@gmail.com"], ["Charlotte Anne Gosdin", "gosdin1977@gmail.com"],
  ["Lyla Kahn", "jenniskahn@gmail.com"], ["Reese Brenkert", "katiebrenkert@yahoo.com"],
  ["Emeline Burkhardt", "burkhardt610@gmail.com"], ["Megan Moravek", "megs.moravek@gmail.com"],
  ["Elli Livingston", "28liviel@gmail.com"], ["Skylar Mardis", "mardisjr@gmail.com"],
  ["Natalie Klaber", "shane.klaber@gmail.com"], ["Claire Johnson", "margaretdjohnson@yahoo.com"],
  ["Leighton Myers", "usx26864@gmail.com"], ["Mia Leitzow", "lilorfn79@yahoo.com"],
  ["Rosa Lloyd", "christarlloyd@hotmail.com"], ["Gabbie Diaz", "shellydiaz0293@gmail.com"],
  ["Neva Vrettos", "neva.vrettos15@gmail.com"], ["Ainsley Blair", "leanne.blair@gmail.com"],
  ["Abi Florea", "cnflorea@yahoo.com"],
  ["Serenity Cole", "msdwarmack@gmail.com"], ["Alex Thumann", "thumannmichelle@gmail.com"],
  ["Madi Swartz", "cswartz17@yahoo.com"], ["Caitlin Ross", "mauramcdanielross@gmail.com"],
  ["Riley McMaster", "Mcmasterjill@yahoo.com"], ["Piper Farrell", "stephaniedill@yahoo.com"],
  ["Lily Kaplan", "GinaRkaplan@gmail.com"], ["Clara Nagel", "johnagel@prodigy.net"],
  ["Caroline Ford", "bford@horizoncpa.biz"], ["Clair Flannagan", "jamie_flannagan@yahoo.com"],
  ["Lily Carr", "molly.carr81@gmail.com"], ["Avonmore Wheatley", "holliewheatley@hotmail.com"],
  ["Storm Johnson", "gregorynjulie@hotmail.com"], ["Sophie Haugh", "dmhaugh@gmail.com"],
  ["Adithi Meruga", "Sunil.meruga@gmail.com"],
];

// Sheet4 sweatshirt/shooting-shirt sizes with no DB value yet (2028s + Elise).
const GEAR_FILLS: Array<[string, string, string]> = [
  ["Lyla Kahn", "M", "S"], ["Reese Brenkert", "L", "M"], ["Emeline Burkhardt", "M", "S"],
  ["Skylar Mardis", "M", "S"], ["Natalie Klaber", "M", "S"], ["Claire Johnson", "L", "M"],
  ["Mia Leitzow", "L", "M"], ["Rosa Lloyd", "L", "M"], ["Gabbie Diaz", "L", "M"],
  ["Neva Vrettos", "L", "M"], ["Ainsley Blair", "L", "M"], ["Abi Florea", "L", "L"],
  ["Elle Swartz", "M", "S"],
];

// Jerseys only where the DB is null.
const JERSEY_FILLS: Array<[string, string]> = [
  ["Alexa Besserman", "34"],
  ["Stella Staubel", "36"],
  ["Elle Swartz", "88"],
];

// The chase list under the 2029 goalie block — recruits, verbatim.
// Claire Thaman skipped (already a PAID tryout registration);
// Brooke Dorschu skipped (already an active rostered player, Dorschug).
const CHASE: Array<{ name: string; school: string | null; notes: string | null; email: string | null }> = [
  { name: "Bella Crumb", school: null, notes: null, email: null },
  { name: "Adele Clinee", school: "Indy", notes: null, email: null },
  { name: "Jurnie Simmons", school: "West Virgnia", notes: "school as written on the sheet", email: null },
  { name: "Eva", school: null, notes: "“Ursaline girl” — as written; last name unknown", email: null },
  { name: "Elle Rissing", school: "Turpin", notes: null, email: null },
  { name: "Kelsey Lorenzen", school: null, notes: null, email: null },
  { name: "Norah Jacobs", school: null, notes: "“29” next to her name — grad year or jersey, unconfirmed", email: null },
  { name: "Hollyn Grove", school: null, notes: null, email: null },
  { name: "Liz Woll", school: null, notes: null, email: null },
];

async function main() {
  const db = serviceClient();
  if (!db) throw new Error("missing Supabase env");

  const { data: playersData, error } = await db
    .from("players")
    .select("id, first_name, last_name, graduation_year, placed_team, jersey_number, school, sweatshirt_size, shooting_shirt_size, fallback_email, unverified_phone, status");
  if (error) throw error;
  const players = playersData ?? [];

  const byName = new Map<string, (typeof players)[number]>();
  for (const p of players) byName.set(normName(`${p.first_name} ${p.last_name}`), p);
  const find = (sheetName: string) => {
    const key = normName(sheetName.replace(/\(.*?\)/g, ""));
    return byName.get(ALIASES[key] ?? key) ?? null;
  };

  // ── 1. Grad-year truth for the play-ups (placed_team stays 2030) ─────
  console.log("1. Play-up grad years (paren annotations, confirmed by Camille's own registration):");
  for (const [name, trueYear] of [["Rowan Feheley", 2032], ["Camile Cannon", 2031]] as const) {
    const p = find(name);
    if (!p) { console.log(`  ! ${name}: no player row`); continue; }
    if (p.graduation_year === trueYear) { console.log(`  = ${name}: already ${trueYear}`); continue; }
    await db.from("players").update({ graduation_year: trueYear, placed_team: "2030" }).eq("id", p.id);
    console.log(`  ✓ ${p.first_name} ${p.last_name}: graduation_year ${p.graduation_year} → ${trueYear}, stays placed on 2030`);
  }

  // ── 2. Schools + guardian phones from the curated tab ────────────────
  console.log("2. Schools (fill-null) + guardian phones by parent-name match:");
  const { data: linksData } = await db.from("player_guardians").select("player_id, guardian_id");
  const { data: guardiansData } = await db.from("guardians").select("id, first_name, last_name, phone");
  const guardianById = new Map((guardiansData ?? []).map((g) => [g.id, g]));
  const guardiansOf = (playerId: string) =>
    (linksData ?? []).filter((l) => l.player_id === playerId).map((l) => guardianById.get(l.guardian_id)).filter(Boolean);

  let phonesFilled = 0, schoolsFilled = 0;
  const unmatchedParents: string[] = [];
  for (const [name, school, parents] of CURATED) {
    const p = find(name);
    if (!p) { console.log(`  ! ${name}: no player row — skipped`); continue; }
    if (school && !p.school) {
      await db.from("players").update({ school }).eq("id", p.id);
      schoolsFilled++;
    }
    const linked = guardiansOf(p.id);
    const orphans: string[] = [];
    for (const [parentName, cell] of parents) {
      const norm = phone(cell);
      if (!norm) { console.log(`  ! ${name}: bad phone "${cell}" for ${parentName} — skipped`); continue; }
      const match = linked.find((g) => g && normName(`${g.first_name} ${g.last_name}`) === normName(parentName));
      if (match) {
        if (!match.phone) {
          await db.from("guardians").update({ phone: norm }).eq("id", match.id);
          match.phone = norm;
          phonesFilled++;
          console.log(`  ✓ ${parentName} (${p.first_name} ${p.last_name}): phone filled`);
        }
      } else {
        orphans.push(`${parentName} ${cell}`);
        unmatchedParents.push(`${p.first_name} ${p.last_name} ← ${parentName} ${cell}`);
      }
    }
    if (orphans.length > 0 && !p.unverified_phone) {
      await db.from("players").update({ unverified_phone: orphans.join("; ") }).eq("id", p.id);
    }
  }
  console.log(`  → ${schoolsFilled} schools filled, ${phonesFilled} guardian phones filled, ${unmatchedParents.length} parent numbers parked as unverified:`);
  for (const u of unmatchedParents) console.log(`    · ${u}`);

  // ── 3. Jersey fills (null-only) ───────────────────────────────────────
  console.log("3. Jersey fills:");
  for (const [name, jersey] of JERSEY_FILLS) {
    const p = find(name);
    if (!p) { console.log(`  ! ${name}: no player row`); continue; }
    if (p.jersey_number) { console.log(`  = ${name}: already #${p.jersey_number}`); continue; }
    await db.from("players").update({ jersey_number: jersey }).eq("id", p.id);
    console.log(`  ✓ ${p.first_name} ${p.last_name} → #${jersey}`);
  }

  // ── 4. Fallback emails (status 'ok' — zero strikethrough in the export) ─
  console.log("4. Fallback emails:");
  let emailsSet = 0;
  for (const [name, email] of FALLBACK_EMAILS) {
    const p = find(name);
    if (!p) { console.log(`  ! ${name}: no player row for email ${email}`); continue; }
    if (p.fallback_email) continue;
    await db.from("players").update({ fallback_email: email.trim(), fallback_email_status: "ok" }).eq("id", p.id);
    emailsSet++;
  }
  console.log(`  → ${emailsSet} fallback emails imported`);

  // ── 5. Sweatshirt / shooting-shirt fills from the gear tab ───────────
  console.log("5. Gear fills (sweatshirt/shooting shirt, null-only):");
  let gearFilled = 0;
  for (const [name, sweatshirt, shooter] of GEAR_FILLS) {
    const p = find(name);
    if (!p) { console.log(`  ! ${name}: no player row`); continue; }
    const fills: Record<string, string> = {};
    if (!p.sweatshirt_size) fills.sweatshirt_size = sweatshirt;
    if (!p.shooting_shirt_size) fills.shooting_shirt_size = shooter;
    if (Object.keys(fills).length === 0) continue;
    await db.from("players").update(fills).eq("id", p.id);
    gearFilled++;
    console.log(`  ✓ ${p.first_name} ${p.last_name}: ${Object.keys(fills).join(", ")}`);
  }
  console.log(`  → ${gearFilled} players gear-filled`);

  // ── 6. The chase list → recruiting pipeline rows ──────────────────────
  console.log("6. Chase list → PIPELINE (source='recruiting'):");
  for (const rec of CHASE) {
    const { data: existing } = await db
      .from("tryout_registrations")
      .select("id")
      .eq("source", "recruiting")
      .ilike("player_full_name", rec.name)
      .limit(1);
    if (existing && existing.length > 0) { console.log(`  = ${rec.name}: already imported`); continue; }
    const { error: insErr } = await db.from("tryout_registrations").insert({
      player_full_name: rec.name,
      source: "recruiting",
      school: rec.school,
      notes: rec.notes,
      email: rec.email,
      parent_name: null,
      phone: null,
      graduation_year: null,
      position: null,
      tryout_group: null,
      tryout_type: null,
      tryout_date: null,
      amount_cents: 0,
      currency: "usd",
      payment_status: "free",
      pipeline_status: "new",
    });
    if (insErr) { console.log(`  ! ${rec.name}: insert failed — ${insErr.message}`); continue; }
    console.log(`  ✓ ${rec.name}${rec.school ? ` (${rec.school})` : ""}`);
  }
  console.log("  Skipped by design: Claire Thaman (already a paid tryout registration), Brooke Dorschu (already an active rostered player).");

  console.log("\nImport complete.");
}

main().catch((err) => { console.error("Import failed:", err); process.exit(1); });
