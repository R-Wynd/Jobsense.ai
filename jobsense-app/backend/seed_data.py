"""Seed sample job data for demo purposes."""
import sys, uuid
from datetime import datetime, date

sys.path.insert(0, '/Users/avenkedeshwaran/IITMBS/Job-sense/JobSpy')
from dotenv import load_dotenv
load_dotenv()

from app.database import SessionLocal, create_tables
from app.models import Job

create_tables()
db = SessionLocal()

SAMPLE_JOBS = [
    {
        "title": "Site Reliability Engineer",
        "company": "Flipkart",
        "location": "Bangalore, India",
        "site": "linkedin",
        "job_url": "https://flipkart.jobs/sre-1",
        "tech_match_count": 8,
        "matched_technologies": "kubernetes, terraform, aws, helm, prometheus, gitops, cicd, sre",
        "ats_score": 87,
        "processing_status": "processed",
        "application_status": "not_applied",
        "description": "Join our SRE team. We need: Kubernetes, Terraform, AWS EKS, Prometheus, Grafana, ArgoCD, Helm, Python, CI/CD, Linux. 2-4 years experience.",
        "date_posted": date(2024, 11, 12),
        "ats_feedback": {
            "matched": ["kubernetes","terraform","aws","helm","prometheus","python","cicd","sre"],
            "missing": ["golang","istio"],
            "feedback": "Strong match on core SRE stack"
        }
    },
    {
        "title": "Platform Engineer",
        "company": "Razorpay",
        "location": "Bangalore, India",
        "site": "indeed",
        "job_url": "https://razorpay.jobs/pe-1",
        "tech_match_count": 7,
        "matched_technologies": "kubernetes, terraform, aws, helm, argocd, cicd, containers",
        "ats_score": 79,
        "processing_status": "processed",
        "application_status": "not_applied",
        "description": "Platform Engineering at Razorpay. Kubernetes, ArgoCD, Terraform, AWS, Docker, Python, Helm, GitOps.",
        "date_posted": date(2024, 11, 12),
        "ats_feedback": {
            "matched": ["kubernetes","terraform","aws","helm","gitops","python","containers"],
            "missing": ["go","kafka"],
            "feedback": "Good platform engineering match"
        }
    },
    {
        "title": "DevOps Engineer",
        "company": "Swiggy",
        "location": "Bangalore, India",
        "site": "linkedin",
        "job_url": "https://swiggy.jobs/devops-1",
        "tech_match_count": 6,
        "matched_technologies": "kubernetes, aws, terraform, cicd, linux, containers",
        "ats_score": 72,
        "processing_status": "processed",
        "application_status": "applied",
        "description": "Swiggy DevOps - Kubernetes, AWS, Terraform, Jenkins, Docker, Linux, Python, CI/CD pipelines.",
        "date_posted": date(2024, 11, 12),
        "ats_feedback": {
            "matched": ["kubernetes","aws","terraform","cicd","linux","containers"],
            "missing": ["argocd","helm","monitoring"],
            "feedback": "Solid DevOps match, missing GitOps experience"
        }
    },
    {
        "title": "Cloud Infrastructure Engineer",
        "company": "Zomato",
        "location": "Gurugram, India",
        "site": "naukri",
        "job_url": "https://zomato.jobs/cloud-1",
        "tech_match_count": 5,
        "matched_technologies": "aws, terraform, kubernetes, python, linux",
        "ats_score": 64,
        "processing_status": "processed",
        "application_status": "not_applied",
        "description": "Cloud infra at Zomato. AWS, Terraform, Kubernetes, Python automation, Linux administration.",
        "date_posted": date(2024, 11, 11),
        "ats_feedback": {
            "matched": ["aws","terraform","kubernetes","python","linux"],
            "missing": ["helm","argocd","observability","cicd"],
            "feedback": "Moderate match - missing several required tools"
        }
    },
    {
        "title": "SRE – Kubernetes Specialist",
        "company": "CRED",
        "location": "Bangalore, India",
        "site": "linkedin",
        "job_url": "https://cred.jobs/sre-k8s",
        "tech_match_count": 9,
        "matched_technologies": "kubernetes, aws, terraform, helm, observability, gitops, cicd, sre, containers",
        "ats_score": 91,
        "processing_status": "processed",
        "application_status": "not_applied",
        "description": "SRE Kubernetes expert needed. EKS, Karpenter, Helm, ArgoCD, Prometheus, Grafana, AlertManager, Terraform, AWS, Python, ClickHouse.",
        "date_posted": date(2024, 11, 10),
        "ats_feedback": {
            "matched": ["kubernetes","aws","terraform","helm","prometheus","grafana","argocd","python","containers","sre"],
            "missing": [],
            "feedback": "Excellent match! Almost all keywords present"
        }
    },
    {
        "title": "Platform Reliability Engineer",
        "company": "PhonePe",
        "location": "Bangalore, India",
        "site": "indeed",
        "job_url": "https://phonepe.jobs/pre-1",
        "tech_match_count": 7,
        "matched_technologies": "kubernetes, aws, terraform, cicd, observability, python, sre",
        "ats_score": 83,
        "processing_status": "processed",
        "application_status": "skipped",
        "description": "PhonePe Platform Reliability. Kubernetes, AWS, Python, Prometheus, Grafana, Terraform, CI/CD, observability, SRE practices.",
        "date_posted": date(2024, 11, 10),
        "ats_feedback": {
            "matched": ["kubernetes","aws","terraform","python","observability","cicd","sre"],
            "missing": ["helm","argocd"],
            "feedback": "Strong match. Consider adding Helm/ArgoCD to resume"
        }
    },
    {
        "title": "DevOps Engineer – FinTech",
        "company": "Groww",
        "location": "Bangalore, India",
        "site": "linkedin",
        "job_url": "https://groww.jobs/devops-1",
        "tech_match_count": 5,
        "matched_technologies": "kubernetes, aws, cicd, linux, containers",
        "ats_score": 58,
        "processing_status": "processed",
        "application_status": "not_applied",
        "description": "Groww DevOps. Kubernetes, AWS, Docker, Jenkins, Linux, Python. Fintech experience a plus.",
        "date_posted": date(2024, 11, 9),
        "ats_feedback": {
            "matched": ["kubernetes","aws","cicd","linux","containers"],
            "missing": ["terraform","helm","argocd","observability","mongodb"],
            "feedback": "Average match - several key skills missing"
        }
    },
    {
        "title": "Site Reliability Engineer",
        "company": "Meesho",
        "location": "Bangalore, India",
        "site": "naukri",
        "job_url": "https://meesho.jobs/sre-1",
        "tech_match_count": 6,
        "matched_technologies": "kubernetes, aws, terraform, cicd, observability, sre",
        "ats_score": 75,
        "processing_status": "scraped",
        "application_status": "not_applied",
        "description": "SRE at Meesho. Kubernetes, AWS, Terraform, Prometheus stack, Python, CI/CD. 1-3 years experience.",
        "date_posted": date(2024, 11, 8),
    },
    {
        "title": "Kubernetes Platform Engineer",
        "company": "Freshworks",
        "location": "Chennai, India",
        "site": "linkedin",
        "job_url": "https://freshworks.jobs/k8s-eng",
        "tech_match_count": 8,
        "matched_technologies": "kubernetes, helm, argocd, terraform, aws, observability, cicd, containers",
        "ats_score": 85,
        "processing_status": "processed",
        "application_status": "applied",
        "description": "Kubernetes platform engineering at Freshworks. Helm, ArgoCD, Terraform, AWS EKS, Prometheus, Grafana.",
        "date_posted": date(2024, 11, 7),
        "ats_feedback": {
            "matched": ["kubernetes","helm","argocd","terraform","aws","observability","cicd","containers"],
            "missing": ["clickhouse","mongodb"],
            "feedback": "Very strong match for platform engineering role"
        }
    },
]

count = 0
for d in SAMPLE_JOBS:
    existing = db.query(Job).filter(Job.job_url == d["job_url"]).first()
    if not existing:
        j = Job(
            id=str(uuid.uuid4()),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            **d
        )
        db.add(j)
        count += 1

db.commit()
db.close()
print(f"Seeded {count} sample jobs into the database.")
