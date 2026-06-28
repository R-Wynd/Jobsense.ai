"""Recurring pipeline scheduler — triggers a full run every N hours.

In-process background thread. State persists in the `schedule` table so the
schedule survives backend restarts (resumed via resume_on_startup()).
Runs never overlap or duplicate jobs: a tick is skipped while another run is
in progress, and scraping upserts by job_url (see repository.upsert_jobs).
"""

import logging
import threading
from datetime import datetime, timedelta

from .database import SessionLocal
from .models import Schedule, PipelineRun
from .repository import RunRepository
from .orchestrator import PipelineOrchestrator

logger = logging.getLogger(__name__)

_thread: threading.Thread | None = None
_stop = threading.Event()
_lock = threading.Lock()
MIN_INTERVAL_HOURS = 1 / 60  # 1 minute floor


def _get_or_create(db) -> Schedule:
    s = db.query(Schedule).filter(Schedule.id == 1).first()
    if not s:
        s = Schedule(id=1, enabled=False, interval_hours=6.0)
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


def get_status() -> dict:
    db = SessionLocal()
    try:
        s = _get_or_create(db)
        return {
            "enabled": bool(s.enabled),
            "interval_hours": float(s.interval_hours or 0),
            "last_run_at": s.last_run_at,
            "next_run_at": s.next_run_at,
        }
    finally:
        db.close()


def _trigger_run():
    db = SessionLocal()
    try:
        # Never overlap an in-flight run.
        running = db.query(PipelineRun).filter(PipelineRun.status == "running").first()
        if running:
            logger.info("[Scheduler] Skipping tick — a run is already in progress")
            return
        run = RunRepository(db).create()
        PipelineOrchestrator(enable_ats=False).run_in_background(
            run_id=run.id, scrape_only=False, max_concurrency=3,
        )
        s = _get_or_create(db)
        now = datetime.utcnow()
        s.last_run_at = now
        s.next_run_at = now + timedelta(hours=float(s.interval_hours or MIN_INTERVAL_HOURS))
        db.commit()
        logger.info("[Scheduler] Triggered run %s; next at %s", run.id[:8], s.next_run_at)
    except Exception as e:
        logger.error("[Scheduler] Trigger failed: %s", e, exc_info=True)
    finally:
        db.close()


def _loop(run_now: bool):
    first = True
    while not _stop.is_set():
        db = SessionLocal()
        try:
            s = _get_or_create(db)
            if not s.enabled:
                break
            interval = max(MIN_INTERVAL_HOURS, float(s.interval_hours or MIN_INTERVAL_HOURS))
        finally:
            db.close()

        if not (first and not run_now):
            _trigger_run()
        first = False

        # Interruptible wait until the next tick.
        if _stop.wait(timeout=interval * 3600):
            break
    logger.info("[Scheduler] Loop exited")


def start(interval_hours: float, run_now: bool = True) -> dict:
    """Enable the schedule and (re)start the loop. Runs immediately if run_now."""
    global _thread
    with _lock:
        db = SessionLocal()
        try:
            s = _get_or_create(db)
            s.enabled = True
            s.interval_hours = float(interval_hours)
            s.next_run_at = datetime.utcnow()
            db.commit()
        finally:
            db.close()

        # Restart the loop so the new interval / run_now applies immediately.
        if _thread and _thread.is_alive():
            _stop.set()
            _thread.join(timeout=3)
        _stop.clear()
        _thread = threading.Thread(target=_loop, args=(run_now,), daemon=True)
        _thread.start()
    logger.info("[Scheduler] Started every %.3f h (run_now=%s)", interval_hours, run_now)
    return get_status()


def stop() -> dict:
    global _thread
    with _lock:
        db = SessionLocal()
        try:
            s = _get_or_create(db)
            s.enabled = False
            s.next_run_at = None
            db.commit()
        finally:
            db.close()
        _stop.set()
        if _thread:
            _thread.join(timeout=3)
        _thread = None
    logger.info("[Scheduler] Stopped")
    return get_status()


def resume_on_startup():
    """If a schedule was enabled before restart, resume it (without an immediate run)."""
    db = SessionLocal()
    try:
        s = _get_or_create(db)
        enabled, interval = bool(s.enabled), float(s.interval_hours or 6.0)
    finally:
        db.close()
    if enabled:
        logger.info("[Scheduler] Resuming schedule (every %.3f h)", interval)
        start(interval, run_now=False)
