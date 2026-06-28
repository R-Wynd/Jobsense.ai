"""Pydantic schemas for API request/response validation."""

from datetime import datetime, date, timezone
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, field_serializer

from .funnel import STATUS_PATTERN


def _utc_iso(dt: Optional[datetime]) -> Optional[str]:
    """
    Serialize a datetime to an ISO string with explicit UTC offset (+00:00).
    This ensures JavaScript's Date() always parses it as UTC, not local time,
    so all subsequent IST conversions in the frontend are correct.
    """
    if dt is None:
        return None
    # If naive (no tzinfo), treat as UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


# ── Run schemas ──────────────────────────────────────────────────────────────

class RunParams(BaseModel):
    scrape_only: bool = False
    enable_ats: bool = False  # checkbox: compute ATS keyword score (still no Claude)
    max_concurrency: int = Field(default=3, ge=1, le=10)
    reprocess_failed: bool = False


class RunAccepted(BaseModel):
    run_id: str
    status: str


class PipelineRunSchema(BaseModel):
    id: str
    status: str
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    jobs_scraped: int = 0
    jobs_processed: int = 0
    jobs_failed: int = 0
    error: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @field_serializer("started_at", "finished_at", "created_at")
    def serialize_dt(self, v: Optional[datetime]) -> Optional[str]:
        return _utc_iso(v)


# ── Job schemas ───────────────────────────────────────────────────────────────

class AtsFeedbackSchema(BaseModel):
    matched: List[str] = []
    missing: List[str] = []
    feedback: str = ""


class JobSchema(BaseModel):
    id: str
    job_url: str
    job_url_direct: Optional[str] = None   # direct company career page
    title: str
    company: Optional[str] = None
    location: Optional[str] = None
    site: Optional[str] = None
    description: Optional[str] = None      # full JD text
    date_posted: Optional[date] = None
    is_remote: Optional[bool] = None
    tech_match_count: int = 0
    matched_technologies: Optional[str] = None
    ats_score: Optional[int] = None
    ats_feedback: Optional[Any] = None
    resume_available: bool = False
    processing_status: str = "scraped"
    application_status: str = "not_applied"
    applied_at: Optional[datetime] = None
    last_run_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @field_serializer("applied_at", "created_at", "updated_at")
    def serialize_dt(self, v: Optional[datetime]) -> Optional[str]:
        return _utc_iso(v)

    @classmethod
    def from_orm_job(cls, job) -> "JobSchema":
        data = {
            "id": job.id,
            "job_url": job.job_url,
            "job_url_direct": getattr(job, "job_url_direct", None),
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "site": job.site,
            "description": job.description,
            "date_posted": job.date_posted,
            "is_remote": job.is_remote,
            "tech_match_count": job.tech_match_count or 0,
            "matched_technologies": job.matched_technologies,
            "ats_score": job.ats_score,
            "ats_feedback": job.ats_feedback,
            "resume_available": bool(job.resume_path),
            "processing_status": job.processing_status,
            "application_status": job.application_status,
            "applied_at": job.applied_at,
            "last_run_id": job.last_run_id,
            "created_at": job.created_at,
            "updated_at": job.updated_at,
        }
        return cls(**data)


class JobStatusUpdate(BaseModel):
    application_status: str = Field(..., pattern=STATUS_PATTERN)


class PaginatedJobs(BaseModel):
    items: List[JobSchema]
    total: int
    page: int
    page_size: int
    total_pages: int


# ── Funnel (Sankey) ───────────────────────────────────────────────────────────

class FunnelNode(BaseModel):
    name: str


class FunnelLink(BaseModel):
    source: str
    target: str
    value: int


class FunnelSchema(BaseModel):
    nodes: List[FunnelNode]
    links: List[FunnelLink]
    sankeymatic: str
    counts: Dict[str, int]
    totals: Dict[str, int]


# ── Schedule (recurring runs) ─────────────────────────────────────────────────

class ScheduleParams(BaseModel):
    interval_hours: float = Field(..., gt=0, le=168)  # up to 1 week


class ScheduleSchema(BaseModel):
    enabled: bool
    interval_hours: float
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None

    @field_serializer("last_run_at", "next_run_at")
    def serialize_dt(self, v: Optional[datetime]) -> Optional[str]:
        return _utc_iso(v)


# ── Health ────────────────────────────────────────────────────────────────────

class HealthSchema(BaseModel):
    ok: bool
    llm_configured: bool
    version: str = "1.0.0"
