# The Roster Command Sheet — credential setup (for Cowork)

One Google Sheet that shows the entire club: every family in the pipeline
(**PIPELINE**), seven fully-rendered team rosters (**2028–2034**), a ten-second
**DASHBOARD**, and a **_SYNC** log in plain English. Supabase is the database;
the Sheet is the windshield.

This supersedes the append-only sync described in
`tryouts-google-sheet-setup.md` — the service-account steps there are the same,
so if a service account already exists, **reuse it** (steps 2–3 below are
already done in that case).

**Everything is fail-soft.** Until the credentials below are set, registration,
confirmation, and payments work exactly as they do today — the Sheet just stays
unconnected, and every sync run says so in plain English.

> ⚠️ This Sheet holds children's full names, parents' emails and phone numbers,
> and emergency contacts. Sharing must stay **Restricted** — Harrison and
> Kathleen by named account, plus the service account as Editor. **Never**
> "Anyone with the link." **Never** "Anyone at the organization."

---

## What to do (5 steps, ~10 minutes)

### 1. Create the spreadsheet
- Make a **new, blank** Google Sheet named **"YOU. FIRST — Roster Command"**.
- Don't add tabs or headers — the engine builds and formats every tab itself
  on the first sync.
- Copy the **Sheet ID** from the URL:
  `https://docs.google.com/spreadsheets/d/`**`THIS_LONG_ID`**`/edit`

### 2. Create a Google service account (skip if one exists)
- Google Cloud Console → pick (or create) a project.
- Enable the **Google Sheets API** for that project.
- **APIs & Services → Credentials → Create credentials → Service account.**
  Name it e.g. `roster-command-writer`. No roles needed.
- Open the service account → **Keys → Add key → JSON**. A `.json` file
  downloads — treat it like a password.

### 3. Share the Sheet to the service account
- In the Sheet: **Share** → paste the service account's email (the
  `…@….iam.gserviceaccount.com` address from the JSON) → role **Editor**.
- While you're there, confirm **General access = Restricted**, and that the
  only named people are Harrison and Kathleen.

### 4. Add the secrets to Vercel (Production **and** Preview)
Vercel → the youfirst-website project → **Settings → Environment Variables**:

| Name | Value |
| --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | the entire JSON key file, pasted as one line |
| `ROSTER_COMMAND_SHEET_ID` | the Sheet ID from step 1 |
| `CRON_SECRET` | any long random string (optional but recommended — locks the cron route) |

Never commit these, never paste them into a chat or terminal. Redeploy after
saving (Deployments → ⋯ → Redeploy).

### 5. First sync + eyes-on check
- Open `/admin/tryouts` and press **Sync Sheet Now**.
- The button reports the result in plain English. Expect: tabs appear, PIPELINE
  fills with every registration, team tabs fill from the roster, DASHBOARD and
  _SYNC stamp themselves.
- Confirm the look: gray columns filled, white columns (Status, Place On Team,
  Jersey #) white with a Carolina-blue left edge, header row near-black.

---

## How it runs after that

- **Cron:** twice a day at 10:00 and 22:00 UTC — 6 AM / 6 PM Eastern during
  the season. (Vercel crons run on UTC, so in winter this drifts to 5 AM / 5 PM
  ET. With real-time mirroring and the Sync Now button, that hour doesn't
  matter; deliberately not "solved.")
- **Real time:** every new registration, every roster confirmation, and every
  Stripe payment mirrors itself onto the Sheet within seconds, fail-soft.
- **Harrison's three columns:** Status and Place On Team on PIPELINE, Jersey #
  on the team tabs. Everything else is regenerated from Supabase on every full
  sync — edits to gray cells don't stick, by design.
- **Placing a girl:** set **Place On Team** on her PIPELINE row → next sync
  (or Sync Now) creates/links her `players` row, carries over her gear sizes
  and parents, and she appears on the team tab. Clearing the dropdown unlinks
  her but **never deletes** her player record.
- **_SYNC tab:** every run, in English. If something fails, the error lands
  there — registrations and payments are never blocked by the Sheet.

## The old tryout sheet

The previous append-only sync (`GOOGLE_SHEET_ID`, one row per registration) is
retired — its code paths now feed the Command Sheet instead. The old
"You. First Team Rosters" sheet stays as a historical reference; the command
sheet is seeded from it (jersey numbers, positions) and supersedes it. Archive
it, don't delete it.
