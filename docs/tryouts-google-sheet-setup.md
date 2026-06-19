# Tryouts → Google Sheet sync — setup checklist (for Cowork)

Every **paid** tryout registration (scheduled and make-up) automatically appends
one row to a Google Sheet, so the club can open the sheet and print rosters.
Supabase stays the source of truth; the sheet is a convenience mirror.

**The sync is fail-soft.** Until the four items below are set, registrations and
payments work normally — the sheet just stays empty. Nothing breaks.

> ⚠️ This sheet holds **minors' personal data**. Share it with **specific named
> Google accounts only** — **never** "Anyone with the link."

---

## What to do (5 steps)

### 1. Create the Google Sheet
- Make a new Google Sheet (e.g. "YOU FIRST — Tryout Registrations").
- In the **first tab**, paste this exact header row in row 1 (left to right, A→J):

  `Timestamp | Tryout Type | Tryout Date | Player Full Name | Parent Name | Email | Phone | Graduation Year | Position | Payment Status`

- Note the tab name. If it is **not** `Sheet1`, you'll set `GOOGLE_SHEET_TAB` in step 4.
- Copy the **Sheet ID** from the URL: `https://docs.google.com/spreadsheets/d/`**`THIS_LONG_ID`**`/edit`.

### 2. Create a Google service account
- Go to Google Cloud Console → pick (or create) a project.
- Enable the **Google Sheets API** for that project.
- **APIs & Services → Credentials → Create credentials → Service account.**
- Give it a name (e.g. "tryouts-sheet-writer"). No roles needed.
- Open the new service account → **Keys → Add key → Create new key → JSON.**
  A `.json` file downloads. Keep it private — it's a password.
- Note the service account's email (looks like
  `tryouts-sheet-writer@your-project.iam.gserviceaccount.com`).

### 3. Share the Sheet with the service account
- In the Google Sheet, click **Share**.
- Add the **service account email** from step 2 as an **Editor**.
- ✅ Confirm sharing is limited to named people + this service account.
- ❌ Do **not** set "Anyone with the link."

### 4. Add the secrets to Vercel
In **Vercel → youfirst-website → Settings → Environment Variables**, add:

| Name | Value |
|---|---|
| `GOOGLE_SHEET_ID` | the Sheet ID from step 1 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | the **entire contents** of the JSON file from step 2 (paste as one value) |
| `GOOGLE_SHEET_TAB` | *(optional)* the tab name, only if it isn't `Sheet1` |

Apply to **Production** (and Preview if you want). Redeploy so the new env loads.

### 5. Tell Harrison/Claude it's set
Once the env vars are live, Claude runs **one test registration end-to-end** and
confirms a row appears in the sheet (then removes the test row). After that,
real paid registrations flow in automatically.

---

## Columns written (in order)
`Timestamp · Tryout Type · Tryout Date · Player Full Name · Parent Name · Email ·
Phone · Graduation Year · Position · Payment Status`

- **Tryout Date** is an ISO date (`2026-07-11`) so the club can sort and print
  per-session lists cleanly.
- **Tryout Type** is `Scheduled` or `Make-up`.
