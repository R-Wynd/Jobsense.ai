"""
Scraper adapter — mirrors scrape_runner.py exactly.

Changes from scrape_runner.py applied here:
  - 10 target roles (added DBRE, AI Platform/Infra, Infrastructure, etc.)
  - SEARCH_PASSES: all of India + a dedicated remote pass (LinkedIn only)
  - hours_old=24: only jobs posted in the last 24 hours
  - Expanded CORE_TECH_PATTERNS to cover Go, operators, PITR, AI/ML, workflow
"""

import os
import re
import sys
import logging
import time
from dataclasses import dataclass, field
from datetime import date
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)

# The scraper uses the `jobspy` package (install: `pip install python-jobspy`).
# Optionally point JOBSPY_PATH at a local JobSpy checkout/fork; otherwise the
# pip-installed package is used. No hardcoded machine-specific path — this keeps
# the app working regardless of where the project lives or is deployed.
JOBSPY_PATH = os.getenv("JOBSPY_PATH")
if JOBSPY_PATH and os.path.isdir(JOBSPY_PATH) and JOBSPY_PATH not in sys.path:
    sys.path.insert(0, JOBSPY_PATH)


# ── Config (mirrors scrape_runner.py) ────────────────────────────────────────

MIN_YEARS = 1
MAX_YEARS = 3
RESULTS_PER_SEARCH = 50
SLEEP_BETWEEN_SEARCHES_SEC = 5
HOURS_OLD = 24

ROLE_QUERIES = [
    ("site reliability engineer",      "kubernetes OR prometheus OR terraform OR AWS OR observability"),
    ("database reliability engineer",  "mongodb OR clickhouse OR kubernetes OR PITR OR backup"),
    ("database platform engineer",     "mongodb OR clickhouse OR kubernetes OR operator OR sharding"),
    ("platform engineer",              "kubernetes OR terraform OR ArgoCD OR helm OR gitops"),
    ("infrastructure engineer",        "AWS OR terraform OR kubernetes OR EKS OR networking"),
    ("cloud infrastructure engineer",  "AWS OR terraform OR kubernetes OR EKS OR cloud"),
    ("ai platform engineer",           "LLM OR MCP OR kubernetes OR python OR mlops"),
    ("ai infrastructure engineer",     "kubernetes OR LLM OR GPU OR AWS OR inference"),
    ("devops engineer",                "kubernetes OR terraform OR gitops OR CI/CD"),
    ("kubernetes engineer",            "EKS OR terraform OR helm OR ArgoCD"),
]

# ── Search passes ─────────────────────────────────────────────────────────────
# Format: (label, location_arg, country_indeed, is_remote, sites)
#
# IN-PERSON: 6 Indian cities, both LinkedIn + Indeed
# REMOTE:    8 global regions, LinkedIn only
#            (Indeed can't combine hours_old + is_remote reliably)

SEARCH_PASSES = [
    # ── Indian cities (in-person) ──────────────────────────────────────────
    ("Chennai",   "Chennai, Tamil Nadu, India",    "India",     False, ["linkedin", "indeed"]),
    ("Bengaluru", "Bengaluru, Karnataka, India",   "India",     False, ["linkedin", "indeed"]),
    ("Hyderabad", "Hyderabad, Telangana, India",   "India",     False, ["linkedin", "indeed"]),
    ("Delhi",     "Delhi, Delhi, India",           "India",     False, ["linkedin", "indeed"]),
    ("Pune",      "Pune, Maharashtra, India",      "India",     False, ["linkedin", "indeed"]),
    ("Mumbai",    "Mumbai, Maharashtra, India",    "India",     False, ["linkedin", "indeed"]),

    # ── Remote passes by region ────────────────────────────────────────────
    ("Remote – India",     "India",                  "India",     True, ["linkedin"]),
    ("Remote – America",   "United States",          "USA",       True, ["linkedin"]),
    ("Remote – Canada",    "Canada",                 "Canada",    True, ["linkedin"]),
    ("Remote – Australia", "Australia",              "Australia", True, ["linkedin"]),
    ("Remote – Germany",   "Germany",                "Germany",   True, ["linkedin"]),
    ("Remote – Dubai",     "Dubai, United Arab Emirates", "UAE",  True, ["linkedin"]),
    ("Remote – UAE",       "United Arab Emirates",   "UAE",       True, ["linkedin"]),
    ("Remote – London",    "London, United Kingdom", "UK",        True, ["linkedin"]),
]

CORE_TECH_PATTERNS = [
    (r"\bkubernetes\b|\bk8s\b|\beks\b",                             "kubernetes"),
    (r"\bterraform\b",                                               "terraform"),
    (r"\baws\b|amazon web services",                                 "aws"),
    (r"\bhelm\b",                                                    "helm"),
    (r"\bargocd\b|argo\s*cd|gitops",                                 "gitops"),
    (r"\bkarpenter\b|gatekeeper|externaldns|alb\s*controller",       "k8s-ecosystem"),
    (r"\bprometheus\b|\bgrafana\b|\balertmanager\b|\bpromql\b",       "observability"),
    (r"\belastic\s*search\b|\belk\b|\bkibana\b",                     "elastic"),
    (r"\bpython\b",                                                   "python"),
    (r"\bgo(?:lang)?\b",                                              "go"),
    (r"\bclickhouse\b",                                               "clickhouse"),
    (r"\bmongodb\b|\bdocumentdb\b",                                   "mongodb"),
    (r"\bpostgres(?:ql)?\b|\bmysql\b|\bredis\b",                     "databases"),
    (r"\boperator\b|reconcil|\bcrd\b|controller",                    "operators"),
    (r"\bpitr\b|point[- ]in[- ]time|disaster recovery|\bbackup\b",   "reliability-eng"),
    (r"\bjenkins\b|github\s*actions|\bci/?cd\b",                     "cicd"),
    (r"\blinux\b",                                                    "linux"),
    (r"\bdocker\b|\bcontainer\b",                                     "containers"),
    (r"\bsre\b|site reliability|\bslo\b|\bsli\b|on[- ]call",         "sre"),
    (r"\bllm\b|\bmcp\b|\bgenai\b|\bmlops\b|machine learning|\bgpu\b|inference", "ai-ml"),
    (r"\btemporal\b|workflow orchestrat",                             "workflow"),
]

MIN_TECH_MATCHES = 2

SENIOR_EXCLUDES_RE = re.compile(
    r"\b(senior|sr\.?|lead|principal|staff|architect|director|head of)\b", re.I
)


# ── Data classes ──────────────────────────────────────────────────────────────

@dataclass
class SearchProfile:
    """Overridable profile — defaults mirror the SEARCH_PASSES config above."""
    role_queries: list = field(default_factory=lambda: ROLE_QUERIES)
    search_passes: list = field(default_factory=lambda: SEARCH_PASSES)
    min_years: int = MIN_YEARS
    max_years: int = MAX_YEARS
    results_per_search: int = RESULTS_PER_SEARCH
    min_tech_matches: int = MIN_TECH_MATCHES
    hours_old: int = HOURS_OLD
    sleep_between: int = SLEEP_BETWEEN_SEARCHES_SEC
    country: str = "India"   # fallback default; each pass provides its own country


@dataclass
class ScrapedJob:
    job_url: str
    title: str
    company: Optional[str]
    location: Optional[str]
    site: str
    description: Optional[str]
    date_posted: Optional[date]
    is_remote: Optional[bool]
    tech_match_count: int
    matched_technologies: list
    search_role: Optional[str] = None
    job_url_direct: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _matched_technologies(text: str) -> list:
    lowered = text.lower()
    return [label for pattern, label in CORE_TECH_PATTERNS
            if re.search(pattern, lowered, re.I)]


def _parse_year_range(text: str):
    m = re.search(r"(\d+)\s*(?:-|to|–)\s*(\d+)\s*y", text, re.I)
    return (int(m.group(1)), int(m.group(2))) if m else None


def _is_experience_match(row: pd.Series, min_y: int, max_y: int) -> bool:
    title = str(row.get("title") or "")
    description = str(row.get("description") or "")
    exp_range = str(row.get("experience_range") or "")
    job_level = str(row.get("job_level") or "").lower()
    combined = f"{title} {description} {exp_range}".lower()

    if SENIOR_EXCLUDES_RE.search(title):
        return False
    if job_level in ("entry level", "associate"):
        return True
    if job_level in ("mid-senior level", "director", "executive"):
        return False

    yr = _parse_year_range(exp_range) or _parse_year_range(combined)
    if yr:
        lo, hi = yr
        return lo <= max_y and hi >= min_y

    if re.search(rf"\b(?:min(?:imum)?\.?|at least)\s*[{min_y}-{max_y}]\s*y", combined):
        return True
    if re.search(rf"\b[{min_y}-{max_y}]\s*\+?\s*years?\b", combined):
        return True
    if re.search(r"\b0\s*[-–]\s*[1-3]\s*y", exp_range, re.I):
        return True

    return False


# ── ScraperAdapter ────────────────────────────────────────────────────────────

class ScraperAdapter:
    def __init__(self, profile: Optional[SearchProfile] = None):
        self.profile = profile or SearchProfile()

    def scrape(self) -> list:
        try:
            from jobspy import scrape_jobs
        except ImportError as e:
            logger.error("JobSpy import failed: %s", e)
            return []

        p = self.profile
        seen_urls: set = set()
        results: list = []

        for role, tech_clause in p.role_queries:
            for label, location_arg, country_indeed, is_remote, sites in p.search_passes:
                years_clause = " OR ".join(str(y) for y in range(p.min_years, p.max_years + 1))
                query = f'"{role}" ({years_clause}) years -senior -lead -principal -staff -architect -director -manager -head ({tech_clause})'
                logger.info("Scraping: %s | %s%s | last %dh",
                            query[:60], label, " [remote]" if is_remote else "", p.hours_old)

                try:
                    df = scrape_jobs(
                        site_name=sites,
                        search_term=query,
                        location=location_arg,
                        country_indeed=country_indeed,
                        is_remote=is_remote,
                        hours_old=p.hours_old,
                        results_wanted=p.results_per_search,
                        linkedin_fetch_description=True,
                        verbose=0,
                    )
                    if df is None or len(df) == 0:
                        logger.info("  → 0 results")
                        continue

                    before = len(df)
                    df = df[df.apply(
                        lambda r: _is_experience_match(r, p.min_years, p.max_years), axis=1
                    )]
                    logger.info("  %d scraped → %d match %d-%dy exp",
                                before, len(df), p.min_years, p.max_years)
                    if len(df) == 0:
                        continue

                    before = len(df)
                    for _, row in df.iterrows():
                        url = str(row.get("job_url") or "").strip()
                        if not url or url in seen_urls:
                            continue

                        text = f"{row.get('title') or ''} {row.get('description') or ''}"
                        techs = _matched_technologies(text)
                        if len(techs) < p.min_tech_matches:
                            continue

                        seen_urls.add(url)
                        dp = row.get("date_posted")
                        direct_url = str(row.get("job_url_direct") or "").strip() or None

                        results.append(ScrapedJob(
                            job_url=url,
                            job_url_direct=direct_url,
                            title=str(row.get("title") or "Unknown Title"),
                            company=str(row.get("company") or "") or None,
                            location=str(row.get("location") or "") or None,
                            site=str(row.get("site") or "unknown"),
                            description=str(row.get("description") or "") or None,
                            date_posted=dp if isinstance(dp, date) else None,
                            is_remote=bool(row.get("is_remote")) if row.get("is_remote") is not None else None,
                            tech_match_count=len(techs),
                            matched_technologies=techs,
                            search_role=role,
                        ))

                    added = len(results) - (len(results) - (len(df) - (before - len(df))))
                    logger.info("  → %d match tech stack (≥%d)", len(results), p.min_tech_matches)

                except Exception as e:
                    logger.warning("Scrape query failed (%s / %s): %s", role, label, e)

                time.sleep(p.sleep_between)

        logger.info("Scraping complete: %d unique jobs", len(results))
        return results
