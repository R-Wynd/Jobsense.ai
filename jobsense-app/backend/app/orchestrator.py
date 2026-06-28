"""Pipeline orchestrator — scrape → match resume → optional ATS score. Zero Claude calls."""

import os
import time
import logging
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from typing import Optional

from .database import SessionLocal
from .repository import JobRepository, RunRepository
from .scraper import ScraperAdapter, SearchProfile
from .resume_adapter import ResumeAdapter
from .ats_service import AtsScoringService

logger = logging.getLogger(__name__)

_active_runs: dict = {}


def get_run_status(run_id: str) -> Optional[dict]:
    return _active_runs.get(run_id)


class PipelineOrchestrator:
    def __init__(self, profile: Optional[SearchProfile] = None, enable_ats: bool = False):
        self.profile = profile or SearchProfile()
        self.scraper = ScraperAdapter(profile=self.profile)
        self.resume_adapter = ResumeAdapter()
        self.ats_service = AtsScoringService() if enable_ats else None
        self.enable_ats = enable_ats

    def run_in_background(self, run_id: str, scrape_only: bool = False,
                          max_concurrency: int = 3, reprocess_failed: bool = False):
        t = threading.Thread(
            target=self._run,
            args=(run_id, scrape_only, max_concurrency, reprocess_failed),
            daemon=True,
        )
        t.start()

    def _run(self, run_id: str, scrape_only: bool, max_concurrency: int, reprocess_failed: bool):
        db = SessionLocal()
        run_repo = RunRepository(db)
        job_repo = JobRepository(db)

        try:
            run_repo.update(run_id, status="running", started_at=datetime.utcnow())
            _active_runs[run_id] = {"status": "running", "phase": "scraping", "progress": 0}

            # Phase 1: Scrape
            logger.info("[Run %s] Starting scrape", run_id)
            scraped = self.scraper.scrape()
            upsert = job_repo.upsert_jobs(scraped)
            run_repo.update(run_id, jobs_scraped=upsert.total)
            logger.info("[Run %s] Scraped %d jobs (%d new, %d updated)",
                        run_id, upsert.total, upsert.created, upsert.updated)

            if scrape_only:
                run_repo.update(run_id, status="completed", finished_at=datetime.utcnow())
                _active_runs[run_id] = {"status": "completed", "progress": 100}
                return

            # Phase 2: Match resumes + optional ATS (no Claude)
            _active_runs[run_id]["phase"] = "matching"
            pending = job_repo.get_unprocessed(run_id, reprocess_failed=reprocess_failed)
            logger.info("[Run %s] %d jobs pending processing", run_id, len(pending))

            processed = 0
            failed = 0
            total_pending = len(pending)

            for job in pending:
                try:
                    # Match best resume (instant, no API)
                    match = self.resume_adapter.suggest_resume(
                        job_title=job.title,
                        job_description=job.description or "",
                    )

                    update_fields = {
                        "resume_path": match.pdf_path,
                        "processing_status": "processed",
                        "last_run_id": run_id,
                        "ats_feedback": {
                            "suggested_resume": match.label,
                            "resume_key": match.key,
                            "match_score": match.score,
                            "matched_keywords": match.matched_keywords,
                            "md_path": match.md_path,
                            "pdf_path": match.pdf_path,
                        },
                    }

                    # Optional ATS scoring (keyword-only, still no Claude)
                    if self.enable_ats:
                        kws = self.resume_adapter.extract_jd_keywords(job.description or "")
                        # Read resume markdown for comparison
                        try:
                            from pathlib import Path
                            resume_text = Path(match.md_path).read_text(encoding="utf-8")
                        except Exception:
                            resume_text = ""
                        ats = self.ats_service.score(resume_text, job.description or "", kws)
                        update_fields["ats_score"] = ats.score
                        update_fields["ats_feedback"]["ats_matched"] = ats.matched_keywords
                        update_fields["ats_feedback"]["ats_missing"] = ats.missing_keywords
                        update_fields["ats_feedback"]["ats_feedback"] = ats.feedback

                    job_repo.update_job(job.id, **update_fields)
                    processed += 1
                    logger.info("[Run %s] Job %s → %s (score=%d)",
                                run_id, job.id[:8], match.key, match.score)

                except Exception as e:
                    logger.error("[Run %s] Failed job %s: %s", run_id, job.id, e)
                    job_repo.update_job(job.id, processing_status="failed")
                    failed += 1

                pct = round(100 * (processed + failed) / max(total_pending, 1))
                _active_runs[run_id]["progress"] = pct
                run_repo.update(run_id, jobs_processed=processed, jobs_failed=failed)

            run_repo.update(
                run_id,
                status="completed",
                finished_at=datetime.utcnow(),
                jobs_processed=processed,
                jobs_failed=failed,
            )
            _active_runs[run_id] = {"status": "completed", "progress": 100}
            logger.info("[Run %s] Done. processed=%d failed=%d", run_id, processed, failed)

        except Exception as e:
            logger.error("[Run %s] Fatal error: %s", run_id, e, exc_info=True)
            run_repo.update(run_id, status="failed", finished_at=datetime.utcnow(), error=str(e))
            _active_runs[run_id] = {"status": "failed"}
        finally:
            db.close()
