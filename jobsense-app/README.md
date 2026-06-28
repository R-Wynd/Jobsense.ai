# JobSense — AI Job Application Pipeline

A personal daily-use web app that scrapes relevant SRE/Platform/DevOps jobs, tailors your
resume for each one using Claude AI, computes an ATS match score, and presents everything
in a clean dashboard so you can apply manually with confidence.

---

## What It Does

```
Scrape jobs (JobSpy)
  → Tailor resume per job (Claude + your master resume + experience file)
    → ATS score each tailored resume vs. the JD (Claude + keyword overlap)
      → Show everything in a sortable/filterable table
        → You apply manually on the company career page
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.10 or later |
| Node.js | 18 or later |
| npm | 9 or later |

---

## Project Layout

```
jobsense-app/
├── backend/          ← FastAPI Python backend
│   ├── app/
│   │   ├── main.py           API routes
│   │   ├── orchestrator.py   Pipeline coordinator
│   │   ├── scraper.py        JobSpy adapter
│   │   ├── resume_adapter.py Claude resume tailoring
│   │   ├── ats_service.py    ATS scoring (keyword + semantic)
│   │   ├── repository.py     Database access layer
│   │   ├── models.py         SQLAlchemy ORM models
│   │   ├── schemas.py        Pydantic request/response schemas
│   │   └── database.py       SQLite setup
│   ├── generated_resumes/    Tailored resume .md files (auto-created)
│   ├── .env                  Your secrets (never commit this)
│   ├── requirements.txt
│   └── seed_data.py          Optional: load demo data
│
└── frontend/         ← React + TypeScript + Tailwind SPA
    ├── src/
    │   ├── App.tsx
    │   ├── api.ts
    │   ├── types.ts
    │   └── components/
    │       ├── Dashboard.tsx
    │       ├── JobsTable.tsx
    │       ├── JobDetailDrawer.tsx
    │       ├── PipelineControls.tsx
    │       ├── RunHistory.tsx
    │       ├── Sidebar.tsx
    │       ├── AtsScoreBadge.tsx
    │       ├── StatusBadge.tsx
    │       └── StatCard.tsx
    ├── package.json
    └── vite.config.ts
```

---

## Setup (First Time Only)

### 1. Backend — Python virtual environment

```bash
cd jobsense-app/backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt
```

### 2. Backend — Configure your API key

```bash
cp .env.example .env
```

Open `.env` and set your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxx
DATABASE_URL=sqlite:///./jobsense.db
```

> ⚠️ Never commit `.env` to git. It is already in `.gitignore`.

### 3. Frontend — Node dependencies

```bash
cd jobsense-app/frontend
npm install
```

---

## Running the App

You need **two terminals** — one for the backend, one for the frontend.

### Terminal 1 — Backend API (port 8000)

```bash
cd jobsense-app/backend
source venv/bin/activate

# Add JobSpy to Python path so the scraper can import it
export PYTHONPATH=/Users/avenkedeshwaran/IITMBS/Job-sense/JobSpy

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Database tables created/verified.
```

Verify it's healthy:
```bash
curl http://localhost:8000/api/health
# → {"ok":true,"llm_configured":true,"version":"1.0.0"}
```

`llm_configured: true` means your API key is loaded. If it shows `false`, check your `.env`.

### Terminal 2 — Frontend (port 5173)

```bash
cd jobsense-app/frontend
npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## Daily Workflow

1. Open **http://localhost:5173**
2. Click **Run Pipeline** on the Dashboard
   - Optionally tick **Scrape only** if you just want new jobs without spending API credits
3. Watch the progress bar — scraping takes ~2–5 min, full AI processing takes longer depending on job count
4. Switch to **Job Tracker** to see all jobs sorted by ATS score
5. Click any row to open the detail drawer:
   - Review matched / missing keywords
   - Download your tailored resume (`.md` file)
   - Click **Open Career Page** to go directly to the application
   - Mark as **Applied**, **Not Applied**, or **Skip**
6. Repeat daily — jobs already processed are skipped automatically (no duplicate API spend)

---

## Resetting the Database

To wipe all jobs and run history and start fresh:

```bash
cd jobsense-app/backend
source venv/bin/activate

python3 -c "
from app.database import SessionLocal
from app.models import Job, PipelineRun
db = SessionLocal()
db.query(Job).delete()
db.query(PipelineRun).delete()
db.commit()
db.close()
print('Database cleared.')
"
```

Or just delete the SQLite file entirely:

```bash
rm jobsense-app/backend/jobsense.db
# The file is recreated automatically on next backend start
```

---

## Loading Demo Data (Optional)

To populate the UI with sample jobs before running a real scrape:

```bash
cd jobsense-app/backend
source venv/bin/activate
python3 seed_data.py
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check + LLM key status |
| POST | `/api/runs` | Start a pipeline run |
| GET | `/api/runs` | List recent runs |
| GET | `/api/runs/{id}` | Run status + progress |
| GET | `/api/jobs` | List/filter/sort jobs (paginated) |
| GET | `/api/jobs/{id}` | Single job detail |
| PATCH | `/api/jobs/{id}` | Update application status |
| POST | `/api/jobs/{id}/reprocess` | Re-tailor + re-score one job |
| GET | `/api/jobs/{id}/resume` | Download tailored resume |

Interactive docs available at: **http://localhost:8000/docs**

---

## Scraper Profile

The scraper is pre-configured in `backend/app/scraper.py` for:

- **Roles**: SRE, Platform Engineer, Cloud Infrastructure Engineer, DevOps Engineer, Kubernetes Engineer
- **Locations**: Chennai, Bangalore, Hyderabad
- **Experience**: 1–3 years
- **Tech filter**: Must match ≥2 of: Kubernetes, Terraform, AWS, Helm, ArgoCD, Prometheus/Grafana, Python, ClickHouse, MongoDB, CI/CD, Linux, Docker, SRE
- **Job sites**: LinkedIn, Indeed

To adjust, edit the `SearchProfile` defaults in `backend/app/scraper.py`.

---

## Resume Assets

The pipeline reads two files to generate tailored resumes:

| File | Purpose |
|------|---------|
| `Aravind_SRE_Master_Resume.pdf` | Your master resume — source of facts, do not fabricate |
| `frsh-contribution.md` | Detailed experience and achievements used for tailoring |

Both paths are hardcoded in `backend/app/resume_adapter.py`. Update them if you move the files.

---

## Troubleshooting

**`llm_configured: false` in health check**
→ `.env` file is missing or `ANTHROPIC_API_KEY` is not set. The backend must be restarted after editing `.env`.

**Scraping returns 0 jobs**
→ Job boards (LinkedIn/Indeed) block requests intermittently. Try again later or reduce `results_per_search` in `scraper.py`. Network-level blocks log a warning and the run continues.

**Resume tailoring is slow**
→ Expected — each job makes 2 Claude API calls. With 20 jobs at concurrency=3, expect 5–10 minutes per run.

**`ModuleNotFoundError: No module named 'jobspy'`**
→ The `PYTHONPATH` export is missing. Make sure you run the backend with:
```bash
export PYTHONPATH=/Users/avenkedeshwaran/IITMBS/Job-sense/JobSpy
```

**Port already in use**
```bash
lsof -ti:8000 | xargs kill -9   # kill backend
lsof -ti:5173 | xargs kill -9   # kill frontend
```
