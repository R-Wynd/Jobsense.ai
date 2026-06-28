"""SQLAlchemy ORM models for the job application pipeline."""

from datetime import datetime, date
from typing import Optional
import json

from sqlalchemy import (
    Column, String, Integer, Boolean, Date, DateTime, Text, Float, JSON,
    ForeignKey, UniqueConstraint, Index, func
)
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class PipelineRun(Base):
    __tablename__ = "pipeline_runs"

    id = Column(String, primary_key=True)
    status = Column(String, nullable=False, default="queued")  # queued|running|completed|failed
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    jobs_scraped = Column(Integer, default=0)
    jobs_processed = Column(Integer, default=0)
    jobs_failed = Column(Integer, default=0)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())

    jobs = relationship("Job", back_populates="last_run", foreign_keys="Job.last_run_id")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True)
    job_url = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    company = Column(String, nullable=True)
    location = Column(String, nullable=True)
    site = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    date_posted = Column(Date, nullable=True)
    is_remote = Column(Boolean, nullable=True)
    tech_match_count = Column(Integer, default=0)
    matched_technologies = Column(String, nullable=True)  # comma-separated
    ats_score = Column(Integer, nullable=True)
    ats_feedback = Column(JSON, nullable=True)  # {matched:[], missing:[], feedback:""}
    resume_path = Column(String, nullable=True)
    job_url_direct = Column(String, nullable=True)   # direct company career page URL
    processing_status = Column(String, default="scraped")  # scraped|tailoring|scored|processed|failed
    application_status = Column(String, default="not_applied")  # not_applied|applied|skipped
    applied_at = Column(DateTime, nullable=True)
    last_run_id = Column(String, ForeignKey("pipeline_runs.id"), nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    last_run = relationship("PipelineRun", back_populates="jobs", foreign_keys=[last_run_id])

    __table_args__ = (
        Index("ix_jobs_ats_score", "ats_score"),
        Index("ix_jobs_application_status", "application_status"),
        Index("ix_jobs_date_posted", "date_posted"),
    )


class Schedule(Base):
    """Single-row recurring-run configuration (id is always 1)."""
    __tablename__ = "schedule"

    id = Column(Integer, primary_key=True, default=1)
    enabled = Column(Boolean, default=False)
    interval_hours = Column(Float, default=6.0)
    last_run_at = Column(DateTime, nullable=True)
    next_run_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
