# Aravind Ram
AI Infrastructure Engineer
Chennai, India | devaravindram@gmail.com | linkedin.com/in/aravindramvjs | https://github.com/r-wynd

---

## Summary
AI Infrastructure Engineer with 2+ years building scalable Kubernetes/AWS infrastructure to host and serve AI and data workloads at scale (60 TB+, 200+ servers). Provisioned EKS platforms with Terraform and GitOps that run MCP servers and LLM-assisted services, integrated observability for AI ops, and operated the data platforms (ClickHouse, MongoDB) that feed analytics and AI pipelines. Strong infrastructure foundations applied to the emerging AI-serving stack. CKAD-certified.

---

## Core Skills
AI/Compute Infrastructure : Kubernetes (EKS) workload scheduling, Karpenter autoscaling, CPU Manager pinning for compute-heavy workloads, container-based hosting of MCP/LLM services
IaC & Platform: Terraform, Helm, ArgoCD GitOps, Docker
Data Infrastructure for AI: ClickHouse (60 TB+ analytics), MongoDB, hot/cold tiered storage (EBS→S3), pipelines feeding AI/analytics
AI Tooling Infra: MCP servers (FastMCP, MetaMCP), Temporal workflow orchestration, LLM-assisted ops services
AWS: IAM/IRSA, VPC, EC2, S3, EKS, Lambda, Route53, ASG, ACM
Observability: Prometheus, Grafana, AlertManager (PromQL), Elastic Stack — metric correlation for AI/ops
Languages: Python, Go, Bash

---

## Experience

### Infrastructure Engineer, AI Workloads — Freshworks *(2023 – Present)*

Infrastructure for AI & Data Services
Provisioned and operated EKS infrastructure (Terraform + ArgoCD GitOps) hosting MCP servers, LLM-assisted tooling, and data services at 200+ servers / 60 TB+ scale
Built CI/CD pipelines (GitHub Actions) for validation, ECR image sync, and automated deployment of AI/data services

Compute Scheduling & Performance
Tuned Kubernetes CPU Manager with dedicated physical-CPU pinning for compute-intensive workloads, reducing CPU throttling ~90% and improving performance ~2×
Implemented Karpenter autoscaling to scale compute elastically and cost-efficiently for large analytics/AI workloads

AI Tooling on the Platform
Built MCP servers (FastMCP/MetaMCP) and an LLM incident assistant (Temporal) running on the platform — query-pattern analysis, alert correlation, RCA generation
Built an AI developer-tooling platform (provisioning Cursor/Claude/Kiro) with usage analytics and a credit-wallet metering system

Data Infrastructure & Storage
Operated the ClickHouse/MongoDB data platforms feeding analytics and AI workflows, with cross-region DR and PITR
Implemented hot/cold tiered storage (EBS → S3) to scale infrastructure cost-efficiently for large datasets; improved query performance ~40%

Reliability & Cost
Standardized GitOps delivery, reducing manual operational toil ~70%
Drove ~30% AWS cost reduction via instance right-sizing and autoscaling

---

## Projects

AI Tooling Platform — infra + analytics + credit-wallet metering for org-wide AI tools
ClickHouse MCP Server — FastMCP/MetaMCP AI-assisted operations service
SOPCTL Incident Assistant — Temporal + LLM automated RCA
CostSenseAI — ML/LLM cloud cost-optimization platform (React, FastAPI)

---

## Education
Bachelor of Science (BS) Degree in Data Science and Applications
Indian Institute of technology, Madras 2023 2027

---

## Certifications
CKAD — Certified Kubernetes Application Developer
