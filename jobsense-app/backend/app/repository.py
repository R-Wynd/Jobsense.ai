"""Repository layer — database access abstraction."""

import uuid
import logging
from datetime import datetime
from typing import Optional, List
from dataclasses import dataclass

from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, func

from .models import Job, PipelineRun

logger = logging.getLogger(__name__)


@dataclass
class UpsertResult:
    created: int
    updated: int

    @property
    def total(self) -> int:
        return self.created + self.updated


class JobRepository:
    def __init__(self, db: Session):
        self.db = db

    def upsert_jobs(self, scraped_jobs: list) -> UpsertResult:
        """Insert new jobs; update volatile fields for existing ones."""
        created = 0
        updated = 0
        for sj in scraped_jobs:
            existing = self.db.query(Job).filter(Job.job_url == sj.job_url).first()
            if existing:
                # Refresh volatile fields, preserve application state + scores
                existing.title = sj.title
                existing.company = sj.company
                existing.location = sj.location
                existing.site = sj.site
                existing.description = sj.description
                existing.date_posted = sj.date_posted
                existing.is_remote = sj.is_remote
                existing.tech_match_count = sj.tech_match_count
                existing.matched_technologies = ", ".join(sj.matched_technologies)
                if sj.job_url_direct:
                    existing.job_url_direct = sj.job_url_direct
                existing.updated_at = datetime.utcnow()
                updated += 1
            else:
                job = Job(
                    id=str(uuid.uuid4()),
                    job_url=sj.job_url,
                    job_url_direct=getattr(sj, 'job_url_direct', None),
                    title=sj.title,
                    company=sj.company,
                    location=sj.location,
                    site=sj.site,
                    description=sj.description,
                    date_posted=sj.date_posted,
                    is_remote=sj.is_remote,
                    tech_match_count=sj.tech_match_count,
                    matched_technologies=", ".join(sj.matched_technologies),
                    processing_status="scraped",
                    application_status="not_applied",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
                self.db.add(job)
                created += 1
        self.db.commit()
        return UpsertResult(created=created, updated=updated)

    def get_unprocessed(self, run_id: str, reprocess_failed: bool = False) -> List[Job]:
        """Jobs not yet fully processed (excludes already-processed ones)."""
        statuses = ["scraped", "tailoring", "scored"]
        if reprocess_failed:
            statuses.append("failed")
        return (
            self.db.query(Job)
            .filter(Job.processing_status.in_(statuses))
            .order_by(desc(Job.tech_match_count))
            .all()
        )

    def update_job(self, job_id: str, **fields) -> Optional[Job]:
        job = self.db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return None
        for k, v in fields.items():
            setattr(job, k, v)
        job.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(job)
        return job

    def get_by_id(self, job_id: str) -> Optional[Job]:
        return self.db.query(Job).filter(Job.id == job_id).first()

    def counts_by_status(self) -> dict:
        """Return {application_status: count} across all jobs."""
        rows = (
            self.db.query(Job.application_status, func.count(Job.id))
            .group_by(Job.application_status)
            .all()
        )
        return {status or "not_applied": count for status, count in rows}

    def query_jobs(
        self,
        application_status: Optional[str] = None,
        min_ats_score: Optional[int] = None,
        location: Optional[str] = None,
        min_tech_match: Optional[int] = None,
        search: Optional[str] = None,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
        page: int = 1,
        page_size: int = 25,
    ):
        q = self.db.query(Job)
        if application_status:
            q = q.filter(Job.application_status == application_status)
        if min_ats_score is not None:
            q = q.filter(Job.ats_score >= min_ats_score)
        if location:
            q = q.filter(Job.location.ilike(f"%{location}%"))
        if min_tech_match is not None:
            q = q.filter(Job.tech_match_count >= min_tech_match)
        if search:
            like = f"%{search.strip()}%"
            q = q.filter(or_(
                Job.title.ilike(like),
                Job.company.ilike(like),
                Job.location.ilike(like),
                Job.matched_technologies.ilike(like),
            ))

        col_map = {
            "ats_score": Job.ats_score,
            "date_posted": Job.date_posted,
            "tech_match_count": Job.tech_match_count,
            "created_at": Job.created_at,
        }
        order_col = col_map.get(sort_by, Job.created_at)
        if sort_dir == "asc":
            q = q.order_by(asc(order_col))
        else:
            q = q.order_by(desc(order_col))

        total = q.count()
        offset = (page - 1) * page_size
        items = q.offset(offset).limit(page_size).all()
        import math
        total_pages = math.ceil(total / page_size) if page_size > 0 else 1
        return items, total, total_pages


class RunRepository:
    def __init__(self, db: Session):
        self.db = db

    def create(self) -> PipelineRun:
        run = PipelineRun(
            id=str(uuid.uuid4()),
            status="queued",
            created_at=datetime.utcnow(),
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)
        return run

    def get(self, run_id: str) -> Optional[PipelineRun]:
        return self.db.query(PipelineRun).filter(PipelineRun.id == run_id).first()

    def update(self, run_id: str, **fields) -> Optional[PipelineRun]:
        run = self.get(run_id)
        if not run:
            return None
        for k, v in fields.items():
            setattr(run, k, v)
        self.db.commit()
        self.db.refresh(run)
        return run

    def list_recent(self, limit: int = 10) -> List[PipelineRun]:
        return (
            self.db.query(PipelineRun)
            .order_by(desc(PipelineRun.created_at))
            .limit(limit)
            .all()
        )
