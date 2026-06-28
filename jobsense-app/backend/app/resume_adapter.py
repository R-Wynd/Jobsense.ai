"""Resume adapter — zero Claude, pure keyword-based template selection from your resumes."""

import re
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

RESUMES_DIR = Path(__file__).parent.parent / "resumes"
MD_DIR = RESUMES_DIR / "Markdown_format"
PDF_DIR = RESUMES_DIR / "PDF_format"

# ── Resume catalog: role key → (md filename, pdf filename, match keywords) ───

RESUME_CATALOG = [
    {
        "key": "sre",
        "md": "sre.md",
        "pdf": "Aravind Site Reliability Engineer Resume.pdf",
        "label": "Site Reliability Engineer",
        "keywords": [
            "site reliability", "sre", "reliability engineer", "on-call", "oncall",
            "incident", "slo", "sli", "error budget", "toil", "postmortem",
            "prometheus", "grafana", "alertmanager", "pagerduty", "opsgenie",
            "runbook", "chaos", "availability", "uptime",
        ],
    },
    {
        "key": "kubernetes_engineer",
        "md": "kubernetes_engineer.md",
        "pdf": "Aravind Kubernetes Platform Engineer Resume.pdf",
        "label": "Kubernetes Platform Engineer",
        "keywords": [
            "kubernetes", "k8s", "eks", "gke", "aks", "helm", "argocd", "argo cd",
            "karpenter", "operator", "crd", "custom resource", "cloud native",
            "kustomize", "gatekeeper", "opa", "istio", "service mesh", "envoy",
            "container orchestration",
        ],
    },
    {
        "key": "platform_engineer",
        "md": "platform_engineer.md",
        "pdf": "Aravind Kubernetes Platform Engineer Resume.pdf",
        "label": "Platform Engineer",
        "keywords": [
            "platform engineer", "platform engineering", "internal developer",
            "idp", "developer experience", "self-service", "gitops", "portal",
            "backstage", "scaffolding", "golden path", "tenant", "multi-tenant",
        ],
    },
    {
        "key": "cloud_infra",
        "md": "cloud_infra.md",
        "pdf": "Aravind Cloud Infrastructure Engineer Resume.pdf",
        "label": "Cloud Infrastructure Engineer",
        "keywords": [
            "cloud infrastructure", "cloud infra", "infrastructure engineer",
            "aws engineer", "terraform", "iac", "infrastructure as code",
            "vpc", "networking", "iam", "cost", "multi-account", "landing zone",
            "ec2", "s3", "route53", "cloudformation",
        ],
    },
    {
        "key": "devops",
        "md": "devops.md",
        "pdf": "Aravind DevOps Engineer Resume.pdf",
        "label": "DevOps Engineer",
        "keywords": [
            "devops", "ci/cd", "cicd", "pipeline", "deployment", "release",
            "jenkins", "github actions", "gitlab", "bitbucket", "automation",
            "build", "deploy", "continuous integration", "continuous delivery",
        ],
    },
    {
        "key": "ai_infrastructure_engineer",
        "md": "ai_infrastructure_engineer.md",
        "pdf": "Aravind AI Infrastructure Engineer Resume.pdf",
        "label": "AI Infrastructure Engineer",
        "keywords": [
            "ai infrastructure", "ml infrastructure", "mlops", "ml engineer",
            "ai platform", "gpu", "cuda", "model serving", "inference",
            "training", "llm", "large language model", "mcp", "vector",
            "machine learning", "deep learning", "data pipeline", "ai ops",
        ],
    },
    {
        "key": "dbre",
        "md": "dbre.md",
        "pdf": "Aravind DATABASE RELIABILITY ENGINEER Resume.pdf",
        "label": "Database Reliability Engineer",
        "keywords": [
            "database reliability", "dbre", "database engineer", "dba",
            "clickhouse", "mongodb", "postgresql", "mysql", "database platform",
            "sharding", "replication", "backup", "pitr", "migration",
            "database performance", "query optimization", "operator",
        ],
    },
]


@dataclass
class ResumeMatch:
    key: str
    label: str
    md_path: str
    pdf_path: str
    score: int        # number of keyword hits
    matched_keywords: list


def _score_resume(text: str, entry: dict) -> tuple[int, list]:
    """Count how many of this resume's keywords appear in the text."""
    lowered = text.lower()
    matched = [kw for kw in entry["keywords"] if kw in lowered]
    return len(matched), matched


class ResumeAdapter:
    """Zero-Claude resume selector. Picks best from your 6 pre-built resumes."""

    def __init__(self):
        pass  # No API key needed

    def suggest_resume(self, job_title: str, job_description: str) -> ResumeMatch:
        """Pick the best-fit resume based on JD keyword matching."""
        text = f"{job_title} {job_description}"

        best = None
        best_score = -1
        best_matched = []

        for entry in RESUME_CATALOG:
            score, matched = _score_resume(text, entry)
            if score > best_score:
                best_score = score
                best = entry
                best_matched = matched

        if not best or best_score == 0:
            best = RESUME_CATALOG[0]  # default to SRE
            best_matched = []

        md_path = str(MD_DIR / best["md"])
        pdf_path = str(PDF_DIR / best["pdf"])

        logger.info("Resume suggested: %s (score=%d, keywords=%s) for: %s",
                    best["key"], best_score, best_matched[:5], job_title[:50])

        return ResumeMatch(
            key=best["key"],
            label=best["label"],
            md_path=md_path,
            pdf_path=pdf_path,
            score=best_score,
            matched_keywords=best_matched,
        )

    def extract_jd_keywords(self, job_description: str) -> dict:
        """Pure regex keyword extraction — no Claude."""
        text = job_description.lower()

        TECH = [
            "kubernetes", "k8s", "eks", "gke", "aks", "helm", "argocd",
            "terraform", "aws", "gcp", "azure", "ec2", "vpc", "iam", "s3",
            "prometheus", "grafana", "alertmanager", "elasticsearch", "kibana",
            "docker", "containerd", "linux", "bash", "python", "go", "golang",
            "jenkins", "github actions", "gitlab ci", "ci/cd",
            "clickhouse", "mongodb", "postgresql", "mysql", "redis", "kafka",
            "envoy", "istio", "ansible", "vault", "datadog", "splunk",
            "karpenter", "argocd", "crossplane", "backstage",
        ]
        SKILLS = [
            "site reliability", "sre", "platform engineering", "devops",
            "cloud native", "gitops", "infrastructure as code",
            "observability", "monitoring", "incident management",
            "on-call", "slo", "sli", "capacity planning",
            "microservices", "distributed systems", "high availability",
            "mlops", "ai infrastructure", "database reliability",
        ]

        found_tech = [t for t in TECH if t in text]
        found_skills = [s for s in SKILLS if s in text]

        return {
            "tools": found_tech,
            "skills": found_skills,
            "all_terms": set(found_tech + found_skills),
        }
