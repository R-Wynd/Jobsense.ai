"""ATS Scoring Service — pure keyword overlap, zero Claude calls."""

import re
import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class AtsResult:
    score: int          # 0-100
    matched_keywords: list
    missing_keywords: list
    feedback: str
    keyword_score: int


STOP_WORDS = {
    "the", "a", "an", "and", "or", "of", "in", "for", "to", "with",
    "is", "are", "be", "by", "on", "at", "this", "that", "will", "have",
    "has", "you", "we", "our", "your", "as", "it", "its", "from", "up",
    "able", "must", "should", "can", "may", "not", "but", "also", "such",
    "both", "all", "new", "other", "more", "than", "their", "they",
    "work", "working", "team", "role", "strong", "excellent", "good",
    "required", "preferred", "experience", "years", "year", "plus",
}


def _normalize(text: str) -> set:
    text = text.lower()
    tokens = re.findall(r"[a-z0-9][a-z0-9/\-\.]*[a-z0-9]|[a-z0-9]+", text)
    return {t for t in tokens if len(t) > 2 and t not in STOP_WORDS}


def _extract_jd_terms(jd_keywords: Optional[dict], job_description: str) -> set:
    terms = set()
    if jd_keywords:
        for lst in [jd_keywords.get("tools", []), jd_keywords.get("skills", [])]:
            for item in lst:
                terms.update(_normalize(item))
    tech_pattern = re.compile(
        r"\b(kubernetes|k8s|eks|terraform|aws|helm|argocd|gitops|prometheus|grafana|"
        r"alertmanager|python|go|golang|clickhouse|mongodb|jenkins|github actions|ci/cd|linux|"
        r"docker|sre|site reliability|devops|platform engineering|observability|"
        r"ansible|vault|istio|envoy|kafka|redis|postgresql|mysql|"
        r"microservices|distributed systems|iac|infrastructure as code)\b",
        re.I,
    )
    for m in tech_pattern.finditer(job_description):
        terms.add(m.group().lower().strip())
    return {t for t in terms if len(t) > 1}


class AtsScoringService:
    """Pure keyword ATS scorer — no API calls."""

    def __init__(self):
        pass

    def score(self, resume_text: str, job_description: str, jd_keywords=None) -> AtsResult:
        jd_terms = _extract_jd_terms(jd_keywords, job_description)
        resume_terms = _normalize(resume_text)

        matched = [t for t in jd_terms if t in resume_terms]
        missing = [t for t in jd_terms if t not in resume_terms]

        if len(jd_terms) == 0:
            keyword_score = 50
        else:
            keyword_score = round(100 * len(matched) / len(jd_terms))
        keyword_score = max(0, min(100, keyword_score))

        feedback_parts = []
        if matched:
            feedback_parts.append(f"Matched: {', '.join(sorted(matched)[:12])}")
        if missing:
            feedback_parts.append(f"Missing: {', '.join(sorted(missing)[:12])}")
        feedback = " | ".join(feedback_parts) or "Keyword analysis complete."

        return AtsResult(
            score=keyword_score,
            matched_keywords=sorted(matched),
            missing_keywords=sorted(missing),
            feedback=feedback,
            keyword_score=keyword_score,
        )
