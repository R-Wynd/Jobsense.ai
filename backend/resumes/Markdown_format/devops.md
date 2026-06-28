# Aravind Ram
DevOps Engineer
Chennai, India | devaravindram@gmail.com | linkedin.com/in/aravindramvjs | https://github.com/r-wynd

---

## Summary
DevOps Engineer with 2+ years of experience automating infrastructure, CI/CD pipelines, and deployment workflows on AWS and Kubernetes. Strong background in GitOps, container orchestration, and building reliable pipelines that ship software faster with less toil.

---

## Core Skills
CI/CD: GitHub Actions, Jenkins, ArgoCD, ECR, automated release pipelines, Helm validation workflows  
Containers & Kubernetes: Docker, EKS, Helm, ArgoCD, Karpenter, Kustomize  
IaC: Terraform, AWS CloudFormation   
AWS: EKS, EC2, VPC, IAM, S3, Route53, ACM, ECR, ASG, Lambda  
Monitoring: Prometheus, Grafana, AlertManager, Elastic Stack, Kibana  
Languages: Python, Bash  
Databases: ClickHouse, MongoDB, PostgreSQL   

---

## Experience

### DevOps / Platform Engineer — Freshworks *(2022 – Present)*

CI/CD & Release Automation
Built GitHub Actions pipelines for Helm schema validation, automated ECR image synchronization to private registries, release tagging, and ArgoCD deployment triggers
Operated Jenkins CI for MongoDB operator builds and integration test execution
Achieved zero-touch deployment for ClickHouse tenants: Python-generated manifests → ArgoCD sync → fully automated provisioning

GitOps & Deployment
Deployed and operated ArgoCD as the single deployment mechanism across all Kubernetes environments
Migrated deployment framework from Kustomize to Helm; introduced values-based configuration for multi-environment consistency
Built remote migration tooling: ClickHouse Remote Functions for customer data onboarding, Route53 cutover automation

Infrastructure Automation
Terraform-automated full AWS stack: EKS, VPC, IAM, Route53, ACM, S3, ASG, Security Groups
Karpenter for dynamic node lifecycle management; Gatekeeper for policy-as-code enforcement
Python-based tenant provisioning: dynamic manifest generation for ClickHouse, ZooKeeper, Envoy

Observability & Reliability
Deployed Prometheus + Grafana + AlertManager with custom PromQL alerting rules; Slack integration for on-call notifications
Elastic Stack + Kibana for centralized log aggregation and debugging
Designed DR framework: automated ClickHouse backups, S3 cross-region replication, automated restore workflows

Performance & Cost
Benchmarked ClickHouse versions before production upgrades; established performance baselines
Built AWS Cost Explorer + Lambda pipeline for per-tenant infrastructure cost reporting
Implemented tiered EBS → S3 storage with ClickHouse TTL policies; reduced storage costs

---

## Projects

SOPCTL Incident Assistant — Slack + Temporal workflow automation for incident response  
ClickHouse MCP Server — AI operational tooling (FastMCP) for query analysis and alerting  
MongoDB Operator Migration — PSMDB → CSMDB with custom operator development; 16 TB data migration

---

## Education
Bachelor of Science (BS) Degree in Data Science and Applications
Indian Institute of technology, Madras 2023 2027
