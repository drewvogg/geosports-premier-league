# 🌍 GeoSports Season Leaderboard

A friend-group leaderboard for [geosports.app](https://geosports.app) scores. Everyone can view; only the commissioner (one admin password) can add rounds, add players, or reset.

Built with Next.js, deployed free on Vercel, with scores stored in Upstash Redis (also free).

## How it works

- `app/page.js` — the leaderboard UI (same design as the original artifact). Edit controls only appear after admin login.
- `app/api/data` — `GET` is public (anyone can read scores); `PUT` requires the admin session cookie.
- `app/api/login` / `logout` — checks `ADMIN_PASSWORD` and sets/clears an httpOnly session cookie (valid 30 days; rotating the password invalidates all sessions).
- `lib/db.js` — Upstash Redis client; all data lives under one key, `geosports:data`. On first load it seeds the original season data automatically.

## Deploy (≈10 minutes)

### 1. Push to GitHub

```bash
cd geosports-leaderboard
git init
git add .
git commit -m "GeoSports leaderboard MVP"
# create an empty repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/geosports-leaderboard.git
git push -u origin main
```

### 2. Import into Vercel

1. Go to [vercel.com/new](https://vercel.com/new), sign in with GitHub, and import the repo.
2. Framework preset should auto-detect **Next.js** — no settings to change.
3. Before (or right after) the first deploy, add the env var:
   - **`ADMIN_PASSWORD`** = whatever password the commissioner should use.

### 3. Add free Redis storage

1. In your Vercel project, open the **Storage** tab → **Create Database** → choose **Upstash Redis** (free tier).
2. Connect it to the project. This automatically injects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL`/`KV_REST_API_TOKEN` — the app accepts either naming).
3. Redeploy (Deployments → ⋯ → Redeploy) so the new env vars take effect.

### 4. Use it

- Share the Vercel URL with the group — they see the live board.
- The commissioner clicks **Commissioner login** at the bottom, enters the password, and the **+ Add Round Scores**, **+ Add Player**, and reset controls appear. The login lasts 30 days per browser.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in ADMIN_PASSWORD + Upstash creds
npm run dev                  # http://localhost:3000
```

You can grab the Upstash REST URL/token from the database page in the Vercel Storage tab (or directly from upstash.com if you created it there).

## Notes & easy upgrades later

- **Editing past scores:** currently the UI only appends new rounds. The API accepts any valid full dataset, so an "edit round" UI is a straightforward add.
- **Custom domain:** free on Vercel under Settings → Domains.
- **More admins:** for now everyone who knows the one password is "the" admin. If you ever want per-person accounts, swap the password check for something like Auth.js or Clerk — the API routes already centralize the `isAdmin()` check in `lib/auth.js`, so it's a one-file change.
- **Free-tier limits:** Upstash free tier allows ~10k commands/day and Vercel's hobby tier is far beyond what a friend leaderboard will use.
