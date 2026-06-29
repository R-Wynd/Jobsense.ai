"""FastAPI main application — Job Application Pipeline API."""

import os
import math
import logging
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from .database import create_tables, get_db, SessionLocal
from .models import Job, PipelineRun
from .repository import JobRepository, RunRepository
from .orchestrator import PipelineOrchestrator, get_run_status
from .resume_adapter import ResumeAdapter
from .schemas import (
    RunParams, RunAccepted, PipelineRunSchema,
    JobSchema, JobStatusUpdate, PaginatedJobs, HealthSchema, FunnelSchema,
    ScheduleParams, ScheduleSchema,
)
from .funnel import build_funnel, STATUS_ALIASES
from . import scheduler

from dotenv import load_dotenv
load_dotenv(override=True)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="JobSense — AI Job Application Pipeline", version="1.0.0")

# CORS — local dev origins, plus any production frontend origins from env.
# Set FRONTEND_ORIGINS as a comma-separated list, e.g.
#   FRONTEND_ORIGINS=https://jobsense.vercel.app,https://jobsense-aravind.vercel.app
_cors_origins = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]
_cors_origins += [o.strip() for o in os.getenv("FRONTEND_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_api_key() -> str:
    """Read key fresh every call so .env changes don't require restart."""
    load_dotenv(override=True)
    return os.getenv("ANTHROPIC_API_KEY", "")


@app.on_event("startup")
def startup():
    create_tables()
    logger.info("Database tables created/verified.")
    scheduler.resume_on_startup()


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/api/health", response_model=HealthSchema)
def health():
    return HealthSchema(ok=True, llm_configured=bool(get_api_key()))


# ── Pipeline Runs ─────────────────────────────────────────────────────────────

@app.post("/api/runs", response_model=RunAccepted, status_code=202)
def start_run(params: RunParams = RunParams(), db: Session = Depends(get_db)):
    run_repo = RunRepository(db)
    run = run_repo.create()

    orch = PipelineOrchestrator(enable_ats=params.enable_ats)
    orch.run_in_background(
        run_id=run.id,
        scrape_only=params.scrape_only,
        max_concurrency=params.max_concurrency,
        reprocess_failed=params.reprocess_failed,
    )
    return RunAccepted(run_id=run.id, status="queued")


@app.get("/api/runs", response_model=list[PipelineRunSchema])
def list_runs(limit: int = Query(default=10, ge=1, le=50), db: Session = Depends(get_db)):
    run_repo = RunRepository(db)
    return [PipelineRunSchema.model_validate(r) for r in run_repo.list_recent(limit)]


@app.get("/api/runs/{run_id}", response_model=PipelineRunSchema)
def get_run(run_id: str, db: Session = Depends(get_db)):
    run_repo = RunRepository(db)
    run = run_repo.get(run_id)
    if not run:
        raise HTTPException(404, detail="Run not found")
    # Merge in-memory progress for live updates
    mem = get_run_status(run_id)
    result = PipelineRunSchema.model_validate(run)
    return result


# ── Jobs ──────────────────────────────────────────────────────────────────────

@app.get("/api/jobs", response_model=PaginatedJobs)
def list_jobs(
    application_status: Optional[str] = Query(default=None),
    min_ats_score: Optional[int] = Query(default=None, ge=0, le=100),
    location: Optional[str] = Query(default=None),
    min_tech_match: Optional[int] = Query(default=None, ge=0),
    search: Optional[str] = Query(default=None),
    sort_by: str = Query(default="created_at"),
    sort_dir: str = Query(default="desc"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
):
    job_repo = JobRepository(db)
    items, total, total_pages = job_repo.query_jobs(
        application_status=application_status,
        min_ats_score=min_ats_score,
        location=location,
        min_tech_match=min_tech_match,
        search=search,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        page_size=page_size,
    )
    return PaginatedJobs(
        items=[JobSchema.from_orm_job(j) for j in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@app.get("/api/schedule", response_model=ScheduleSchema)
def get_schedule():
    return ScheduleSchema(**scheduler.get_status())


@app.post("/api/schedule", response_model=ScheduleSchema)
def set_schedule(params: ScheduleParams):
    """Start (or update) a recurring run every `interval_hours`; runs immediately."""
    return ScheduleSchema(**scheduler.start(params.interval_hours))


@app.delete("/api/schedule", response_model=ScheduleSchema)
def clear_schedule():
    return ScheduleSchema(**scheduler.stop())


@app.get("/api/funnel", response_model=FunnelSchema)
def get_funnel(db: Session = Depends(get_db)):
    """Application funnel as a Sankey graph (+ SankeyMATIC source text)."""
    job_repo = JobRepository(db)
    return FunnelSchema(**build_funnel(job_repo.counts_by_status()))


@app.get("/api/jobs/{job_id}", response_model=JobSchema)
def get_job(job_id: str, db: Session = Depends(get_db)):
    job_repo = JobRepository(db)
    job = job_repo.get_by_id(job_id)
    if not job:
        raise HTTPException(404, detail="Job not found")
    return JobSchema.from_orm_job(job)


@app.patch("/api/jobs/{job_id}", response_model=JobSchema)
def update_job_status(job_id: str, body: JobStatusUpdate, db: Session = Depends(get_db)):
    from datetime import datetime
    job_repo = JobRepository(db)
    existing = job_repo.get_by_id(job_id)
    if not existing:
        raise HTTPException(404, detail="Job not found")

    status = STATUS_ALIASES.get(body.application_status, body.application_status)
    fields = {"application_status": status}
    if status in ("not_applied", "skipped"):
        # Pre-application states — no applied date.
        fields["applied_at"] = None
    elif existing.applied_at is None:
        # First time it enters an applied/interview stage — stamp the date.
        fields["applied_at"] = datetime.utcnow()

    job = job_repo.update_job(job_id, **fields)
    return JobSchema.from_orm_job(job)


@app.post("/api/jobs/{job_id}/reprocess", status_code=202)
def reprocess_job(job_id: str, db: Session = Depends(get_db)):
    job_repo = JobRepository(db)
    job = job_repo.get_by_id(job_id)
    if not job:
        raise HTTPException(404, detail="Job not found")

    job_repo.update_job(job_id, processing_status="scraped")

    run_repo = RunRepository(db)
    run = run_repo.create()

    import threading
    def _reprocess():
        from .database import SessionLocal as _SL
        _db = _SL()
        _job_repo = JobRepository(_db)
        _run_repo = RunRepository(_db)
        try:
            _run_repo.update(run.id, status="running")
            _j = _job_repo.get_by_id(job_id)
            if _j:
                adapter = ResumeAdapter()
                match = adapter.suggest_resume(_j.title, _j.description or "")
                _job_repo.update_job(_j.id,
                    resume_path=match.pdf_path,
                    processing_status="processed",
                    ats_feedback={
                        "suggested_resume": match.label,
                        "resume_key": match.key,
                        "match_score": match.score,
                        "matched_keywords": match.matched_keywords,
                        "md_path": match.md_path,
                        "pdf_path": match.pdf_path,
                    },
                )
            _run_repo.update(run.id, status="completed", jobs_processed=1)
        except Exception as e:
            _run_repo.update(run.id, status="failed", error=str(e))
        finally:
            _db.close()

    threading.Thread(target=_reprocess, daemon=True).start()
    return {"job_id": job_id, "run_id": run.id, "status": "queued"}


@app.get("/api/jobs/{job_id}/resume")
def view_resume(job_id: str, fmt: str = Query(default="pdf"), db: Session = Depends(get_db)):
    """Serve the suggested resume — inline so browser opens it in a new tab."""
    import re as _re
    job_repo = JobRepository(db)
    job = job_repo.get_by_id(job_id)
    if not job or not job.resume_path:
        raise HTTPException(404, detail="Resume not found for this job.")

    path = Path(job.resume_path)
    if not path.exists():
        raise HTTPException(404, detail="Resume file not found on disk.")

    # If format=md requested, return the markdown file
    if fmt == "md" and job.ats_feedback and isinstance(job.ats_feedback, dict):
        md_path = job.ats_feedback.get("md_path")
        if md_path and Path(md_path).exists():
            return FileResponse(
                md_path,
                media_type="text/markdown",
                headers={"Content-Disposition": f"inline; filename=\"{Path(md_path).name}\""},
            )

    # Default: serve the PDF inline (opens in browser tab, not download)
    if path.suffix == ".pdf":
        safe_name = _re.sub(r"[^\w\-. ]", "_", path.name)
        return FileResponse(
            str(path),
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=\"{safe_name}\""},
        )

    return FileResponse(
        str(path),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"inline; filename=\"{path.name}\""},
    )


@app.get("/api/jobs/{job_id}/resume/content")
def get_resume_content(job_id: str, db: Session = Depends(get_db)):
    """Return resume markdown text for in-browser viewing/editing."""
    job_repo = JobRepository(db)
    job = job_repo.get_by_id(job_id)
    if not job:
        raise HTTPException(404, detail="Job not found.")

    # Find the markdown path from ats_feedback or try resume_path
    md_path = None
    if job.ats_feedback and isinstance(job.ats_feedback, dict):
        md_path = job.ats_feedback.get("md_path")
    if not md_path and job.resume_path:
        # If resume_path is a .md file
        p = Path(job.resume_path)
        if p.suffix == ".md" and p.exists():
            md_path = str(p)

    if not md_path or not Path(md_path).exists():
        raise HTTPException(404, detail="Resume markdown not found.")

    content = Path(md_path).read_text(encoding="utf-8")
    suggested = ""
    if job.ats_feedback and isinstance(job.ats_feedback, dict):
        suggested = job.ats_feedback.get("suggested_resume", "")
    return {"content": content, "job_id": job_id, "title": job.title,
            "company": job.company, "suggested_resume": suggested}


@app.put("/api/jobs/{job_id}/resume/content")
def save_resume_content(job_id: str, body: dict, db: Session = Depends(get_db)):
    """Save edited resume markdown back to disk."""
    job_repo = JobRepository(db)
    job = job_repo.get_by_id(job_id)
    if not job or not job.resume_path:
        raise HTTPException(404, detail="Resume not found for this job.")
    path = Path(job.resume_path)
    content = body.get("content", "")
    if not content:
        raise HTTPException(400, detail="Content cannot be empty.")
    path.write_text(content, encoding="utf-8")
    return {"ok": True, "saved": True}


@app.get("/api/jobs/{job_id}/resume/pdf")
def download_resume_pdf(job_id: str, db: Session = Depends(get_db)):
    """Generate and download a PDF of the tailored resume."""
    import re as _re
    job_repo = JobRepository(db)
    job = job_repo.get_by_id(job_id)
    if not job or not job.resume_path:
        raise HTTPException(404, detail="Resume not found for this job.")
    md_path = Path(job.resume_path)
    if not md_path.exists():
        raise HTTPException(404, detail="Resume file not found on disk.")

    md_content = md_path.read_text(encoding="utf-8")
    pdf_path = md_path.with_suffix(".pdf")

    try:
        import markdown2
        from weasyprint import HTML, CSS

        html_body = markdown2.markdown(md_content, extras=["tables", "fenced-code-blocks"])

        css = CSS(string="""
            @page { margin: 18mm 16mm; size: A4; }
            body {
                font-family: 'Arial', sans-serif;
                font-size: 10pt;
                line-height: 1.5;
                color: #1a1a1a;
            }
            h1 { font-size: 18pt; margin: 0 0 2px 0; color: #1a1a1a; }
            h2 { font-size: 11pt; border-bottom: 1.5px solid #4f46e5;
                 color: #4f46e5; padding-bottom: 2px; margin: 14px 0 6px 0; }
            h3 { font-size: 10.5pt; margin: 10px 0 3px 0; color: #1a1a1a; }
            p { margin: 3px 0; }
            ul { margin: 3px 0 6px 0; padding-left: 16px; }
            li { margin-bottom: 2px; }
            strong { color: #1a1a1a; }
            hr { border: none; border-top: 1px solid #e5e7eb; margin: 8px 0; }
            .badge {
                display: inline-block;
                background: #4f46e5;
                color: white;
                font-size: 8pt;
                padding: 1px 8px;
                border-radius: 10px;
                margin-right: 4px;
            }
        """)

        # Inject K8s + role badges at top
        badges = '<div style="margin-bottom:8px">'
        badges += '<span class="badge">⎈ Kubernetes</span>'
        badges += '<span class="badge">☁ AWS</span>'
        badges += '<span class="badge">⚡ Terraform</span>'
        badges += '</div>'

        full_html = f"<html><body>{badges}{html_body}</body></html>"
        HTML(string=full_html).write_pdf(str(pdf_path), stylesheets=[css])

    except Exception as e:
        logger.error("PDF generation failed: %s", e)
        raise HTTPException(500, detail=f"PDF generation failed: {e}")

    safe_company = _re.sub(r"[^\w\-]", "_", job.company or "company")
    safe_title = _re.sub(r"[^\w\-]", "_", job.title or "role")
    filename = f"Aravind_{safe_company}_{safe_title}.pdf"
    # inline → opens in browser tab instead of triggering a download
    return FileResponse(
        str(pdf_path),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=\"{filename}\""},
    )


# ── Serve frontend build (production) ────────────────────────────────────────
FRONTEND_DIST = Path(__file__).parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
