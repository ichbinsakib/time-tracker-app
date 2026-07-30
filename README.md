# Time Tracker

A small React + Supabase app for tracking contractor hours, pay rate, and paid/unpaid
status per worker. Built to replace a Google Sheet ("TIME TRACKER (Responses)") that
tracked hours for EMON and TUHIN.

## 1. Create the Supabase project

1. Go to https://supabase.com, sign in, and click **New project**.
2. Pick any name/region and a database password (save it somewhere safe — you won't need
   it for this app, but Supabase requires one).
3. Once the project finishes provisioning, open **SQL Editor** (left sidebar) → **New query**.
4. Paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
   This creates the `workers` and `time_entries` tables, seeds the two workers
   (EMON, TUHIN), and locks the tables down so only signed-in users can read/write.
5. Paste the contents of `seed.sql` (kept out of this public repo — see
   `../time-tracker-private-data/seed.sql` on the machine this was built on, or regenerate
   it with `node scripts/gen-seed.mjs` from the CSVs in `../time-tracker-private-data/source-data/`)
   and click **Run**. This loads all ~1,428 historical rows from the original Google Sheet.
6. Go to **Authentication → Users → Add user** and create yourself a login
   (email + password). This is the only account that will be able to sign in to the app.
7. Go to **Project Settings → API**. Copy the **Project URL** and the **anon public** key —
   you'll need both in step 2 below.

## 2. Configure and run locally

```bash
cp .env.example .env
```

Edit `.env` and fill in the two values from Supabase:

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Then:

```bash
npm install
npm run dev
```

Open the printed local URL and sign in with the user you created in step 1.6.

## 3. Deploy to GitHub Pages

A workflow at `.github/workflows/deploy.yml` builds and deploys automatically on every
push to `main`. Before pushing:

1. Create a new GitHub repo and push this project to it (see commands below).
2. In the repo, go to **Settings → Pages** and set **Source** to "GitHub Actions".
3. Go to **Settings → Secrets and variables → Actions → New repository secret** and add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Push to `main` (or re-run the workflow) — the app will be live at
   `https://<your-username>.github.io/<repo-name>/`.

The anon key is safe to expose publicly — it only grants what your Row Level Security
policies allow, which here is "must be signed in." Anyone visiting the site still hits
the Login screen and needs the Supabase user credentials you created.

## Notes on the data

- `payable_amount` is a generated column (`hours_worked * hourly_rate`) — you never set
  it directly, it's always computed by the database.
- `previous_due` mirrors the sheet's "Previous Due Payment" column; it was only populated
  on a handful of original rows and isn't a running balance.
- EMON's historical data runs through Jan 2024; TUHIN's is ongoing through the import date.
