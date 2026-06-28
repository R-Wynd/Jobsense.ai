# Aravind Ram
Cloud Infrastructure Engineer
Chennai, India | devaravindram@gmail.com | linkedin.com/in/aravindramvjs | github.com/r-wynd

---

## Summary
Cloud Infrastructure Engineer with 2+ years designing and automating AWS infrastructure at scale. Specializes in Terraform IaC, EKS cluster provisioning, multi-account AWS architecture, and cost-optimized infrastructure design. Experienced operating petabyte-scale data infrastructure with strong reliability and cost engineering practices.

---

## Core Skills
Cloud (AWS): EKS, EC2, VPC design, IAM (roles, IRSA, policies), Route53, ACM, S3 (lifecycle, cross-region replication), ASG, Cost Explorer, Lambda, CloudWatch  
IaC: Terraform (modules, remote state, workspaces), Terragrunt   
Containers & Orchestration: Kubernetes (EKS), Helm, ArgoCD, Docker  
Observability: Prometheus, Grafana, AlertManager, Elastic Stack, AWS Cost Explorer + Lambda pipelines  
Languages: Python, Bash  
Data Platforms: ClickHouse, MongoDB, DocumentDB  

---

## Experience

### Cloud Infrastructure Engineer — Freshworks *(2023 – Present)*

AWS Infrastructure Automation
Provisioned and maintained production AWS infrastructure for ClickHouse analytics platform (60 TB+, 200+ servers) entirely via Terraform
Designed reusable Terraform modules for EKS clusters, VPCs, IAM roles, Route53 zones, ACM certificates, S3 buckets, Auto Scaling Groups, Security Groups
Implemented tiered storage architecture: ClickHouse TTL policies move cold data from EBS to S3; local EBS caching for hot data — reduced storage costs substantially
S3 cross-region replication for DR: hourly ClickHouse backups replicated across regions; automated restore workflows; improved RTO from hours to minutes

Infrastructure Cost Engineering
Built AWS Cost Explorer + Lambda aggregation pipeline for per-tenant infrastructure cost visibility
Delivered cost dashboards to engineering and leadership for infrastructure spend optimization
Designed hot/cold storage tiering strategy reducing storage costs without impacting query performance

Kubernetes on AWS
Deployed EKS clusters with Karpenter for node lifecycle management (on-demand + spot blending)
Configured IRSA for workload-level IAM, ALB Ingress Controller, ExternalDNS with Route53 automation
Managed ClickHouse platform lifecycle: upgrades, capacity planning, performance benchmarking across versions

CI/CD & Automation
GitHub Actions pipelines: infrastructure plan/apply automation, ECR image sync, Helm validation
Python automation: tenant provisioning, manifest generation, ArgoCD deployment integration
Built remote data migration framework: ClickHouse Remote Functions for customer cluster onboarding; Route53 cutover procedures

Reliability
Designed and executed DR framework: automated backups, cross-region replication, snapshot recovery
Owned on-call for infrastructure incidents; built SOPCTL automation for faster incident resolution

---

## Projects

Infrastructure Cost Dashboard — AWS Cost Explorer + Lambda + custom dashboarding for per-tenant spend  
ClickHouse MCP Server — AI-assisted infra operational tooling  
MongoDB Migration — 16 TB DocumentDB → self-hosted MongoDB on Kubernetes

---

## Education
Bachelor of Science (BS) Degree in Data Science and Applications
Indian Institute of technology, Madras 2023 2027

---

## Certifications
CKAD — Certified Kubernetes Application Developer
