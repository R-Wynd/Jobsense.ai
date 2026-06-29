# Deploying JobSense + viewing on mobile

## ⚠️ Important: Vercel can only host the frontend

Vercel runs **stateless serverless functions** (10–60s max, no persistent disk,
no background threads). This app's backend needs the opposite:

| Backend needs | Why Vercel can't |
|---|---|
| SQLite file on disk (`jobsense.db`) | serverless filesystem is wiped each call |
| Background scheduler + scrape threads | functions die after the response |
| Scrape runs that take minutes | exceed the function timeout |
| weasyprint (PDF) + JobSpy | need system libraries / long processes |

So: **frontend → Vercel, backend → an always-on host** (Render / Railway / Fly / a VPS).

---

## Option A — Just view it on your phone NOW (no cloud deploy)

Fastest path. Run both locally, expose with a tunnel.

1. Start backend (from `backend/`):
   ```
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
2. Start frontend (from `frontend/`):
   ```
   npm run dev -- --host
   ```
3. **Same Wi-Fi:** open `http://<your-computer-LAN-IP>:5173` on your phone
   (find the IP with `ipconfig getifaddr en0` on macOS).
   The Vite proxy forwards `/api` to the backend automatically.

   **Different network:** use a tunnel instead (gives a public HTTPS URL):
   ```
   brew install cloudflared
   cloudflared tunnel --url http://localhost:5173
   ```
   Open the printed `https://*.trycloudflare.com` URL on your phone.
   (ngrok works too: `ngrok http 5173`.)

This keeps the scheduler, scraping, and PDF features fully working because the
backend runs on your machine. The catch: it only works while your computer is on.

---

## Option B — Always-on: single EC2 box + Elastic IP  ⭐ recommended

One server runs everything. `app/main.py` already serves the built frontend at `/`
and the API at `/api`, so there's **one origin — no CORS, no VITE_API_URL needed.**

### 1. Launch the instance
- AMI: **Ubuntu 24.04**, type: **t3.small** (2 GB; t3.micro/1 GB works for light use).
- Allocate an **Elastic IP** and associate it with the instance.
- Security group inbound: **22** (SSH, your IP) and **8000** (HTTP, 0.0.0.0/0).
  (Or 80 if you front it with nginx — see step 6.)

### 2. SSH in and install deps
```bash
sudo apt update
sudo apt install -y python3.12-venv python3-pip nodejs npm git \
  libpango-1.0-0 libpangocairo-1.0-0 libcairo2 libgdk-pixbuf-2.0-0 shared-mime-info fonts-dejavu
```

### 3. Get the code + persistent data dir
```bash
git clone https://github.com/R-Wynd/Jobsense.ai.git ~/Jobsense.ai
mkdir -p ~/jobsense-data
```

### 4. Backend venv
```bash
cd ~/Jobsense.ai/backend
python3.12 -m venv venv && source venv/bin/activate
pip install -r requirements.txt weasyprint markdown2
```

### 5. Build the frontend (served by the backend)
```bash
cd ~/Jobsense.ai/frontend
npm ci && npm run build      # do NOT set VITE_API_URL → uses same-origin /api
```

### 6. Run always-on with systemd
```bash
sudo cp ~/Jobsense.ai/deploy/jobsense.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now jobsense
sudo systemctl status jobsense           # should be active (running)
```
Open **`http://<ELASTIC-IP>:8000`** on your phone → "Add to Home Screen".

> Optional port 80: `sudo apt install -y nginx` and reverse-proxy `/` → `127.0.0.1:8000`,
> then open SG port 80 instead of 8000.

### Update + restart after pushing code changes
```bash
cd ~/Jobsense.ai && git pull
cd backend && source venv/bin/activate && pip install -r requirements.txt   # if deps changed
cd ../frontend && npm ci && npm run build                                   # if UI changed
sudo systemctl restart jobsense
sudo systemctl status jobsense
```

### Notes
- Cost: t3.small ≈ $15/mo (or 12-month free-tier t3.micro if eligible). Elastic IP is
  free **while attached** to a running instance.
- **Single worker only** (the unit file enforces this) — multiple workers would run
  multiple scheduler threads and duplicate scheduled runs.
- For HTTPS (nicer on mobile), point a domain at the Elastic IP and run
  `sudo certbot --nginx`. Plain `http://<ip>:8000` works fine for personal use.

---

## Option C — Frontend on Vercel + Backend on Render

### 1. Deploy the backend (Render, free tier)

1. Push this repo to GitHub.
2. Render → **New → Web Service** → connect the repo.
3. Settings:
   - **Root Directory:** `backend`
   - **Runtime:** Docker (it auto-detects `Dockerfile`)
   - **Instance:** Free is fine to start
4. **Add a Persistent Disk** (so SQLite + resumes survive redeploys):
   - Mount path: `/data`, size: 1 GB
5. **Environment variables:**
   - `DATABASE_URL = sqlite:////data/jobsense.db`  (note the 4 slashes = absolute path)
   - `FRONTEND_ORIGINS = https://YOUR-APP.vercel.app`  (fill in after step 2)
6. Deploy. Note the URL, e.g. `https://jobsense-api.onrender.com`.
   Verify: open `https://jobsense-api.onrender.com/api/health` → `{"ok":true,...}`.

> Note: Render Free spins the service down when idle and cold-starts on the next
> request (~30s). For an always-running scheduler, use a paid instance or Railway/Fly.

### 2. Deploy the frontend (Vercel)

1. Vercel → **Add New → Project** → import the repo.
2. Settings:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite (auto-detected)
   - **Build:** `npm run build` · **Output:** `dist`
3. **Environment variable:**
   - `VITE_API_URL = https://jobsense-api.onrender.com`  (your Render URL, no trailing slash)
4. Deploy → you get `https://YOUR-APP.vercel.app`.

### 3. Close the loop (CORS)

Put the Vercel URL into the backend's `FRONTEND_ORIGINS` env var on Render and
redeploy the backend. Now the browser is allowed to call the API.

### 4. View on mobile

Open `https://YOUR-APP.vercel.app` on your phone — it's a normal public HTTPS URL.
"Add to Home Screen" for an app-like icon.

---

## What changed in the code to make this work
- `frontend/src/api.ts` — API base now reads `VITE_API_URL` (falls back to `/api` in dev).
- `backend/app/main.py` — CORS reads extra origins from `FRONTEND_ORIGINS`.
- `backend/Dockerfile` — container with weasyprint libs + `python-jobspy` installed.
- `backend/app/database.py` — already honors `DATABASE_URL` (point it at the disk).

## Heads-up
- **Scheduler only runs while the backend process is alive.** On Render Free
  (which sleeps when idle) it won't fire reliably — use a paid/always-on instance,
  or keep using Option A locally for scheduled scraping.
- Scraping hits LinkedIn/Indeed and is rate-limited; keep schedule intervals at
  hours, not minutes.
