# Aravind Ram
Kubernetes / Cloud Native Engineer
Chennai, India | devaravindram@gmail.com | linkedin.com/in/aravindramvjs | https://github.com/r-wynd

---

## Summary
Cloud Native engineer with 2+ years of hands-on Kubernetes platform engineering at scale. Designed and operated EKS clusters running 200+ nodes and 60 TB+ data workloads. Expert in Helm chart authoring, ArgoCD GitOps, custom Kubernetes operators, and production-grade cluster hardening with OPA Gatekeeper.

---

## Core Skills
Kubernetes : EKS, Karpenter, Helm (chart authoring, templating, umbrella charts), ArgoCD, Kustomize, Gatekeeper/OPA, ExternalDNS, ALB Ingress Controller, Storage Classes, CPU Manager, Custom Resource Definitions, Operator SDK  
Cloud Native Ecosystem: Prometheus, Grafana, AlertManager, Envoy, ZooKeeper, ClickHouse Operator, MongoDB Operator  
AWS: EKS, EC2, VPC, IAM Roles for Service Accounts (IRSA), Route53, ACM, S3, ASG, ECR  
IaC: Terraform (modules, workspaces, state management), GitHub Actions  
Languages: Python, Bash, YAML, Go   

---

## Experience

### Kubernetes Platform Engineer — Freshworks *(2022 – Present)*

Cluster Design & Operations
Provisioned and operated multi-tenant EKS clusters on AWS for ClickHouse analytics platform (60 TB, 200+ servers)
Terraform-automated full AWS stack: VPC, Security Groups, IAM roles, Route53, ACM, S3 buckets, Auto Scaling Groups
Deployed and managed: Karpenter for node lifecycle, Gatekeeper for OPA policy enforcement, ExternalDNS, ALB Controller, ClickHouse Operator, ZooKeeper
Migrated deployment system from Kustomize → Helm umbrella charts; standardized values-based multi-environment config

GitOps & Release Automation
Operated ArgoCD as the sole deployment mechanism across all environments; enforced GitOps discipline
Built GitHub Actions pipelines: Helm schema validation, automated ECR image sync, release tagging, ArgoCD deployment triggers
Implemented remote migration framework using ClickHouse Remote Functions for customer data onboarding; Route53 cutover automation

Operator Development
Led full migration from Percona MongoDB Operator → custom Community MongoDB Operator (CSMDB)
Rewrote reconciliation logic for sharding management, backup workflows, PITR, resource lifecycle
Built integration tests and E2E coverage; Jenkins CI pipeline for operator builds

Performance Tuning
Benchmarked Kubernetes CPU Manager policies for ClickHouse; static CPU allocation reduced throttling by ~90%
Evaluated ClickHouse Lazy Materialization feature; improved SELECT query performance by ~40%
Implemented tiered storage (EBS → S3 via TTL policies + local EBS cache) reducing storage costs while maintaining query performance

Observability
Full Prometheus + Grafana + AlertManager deployment; custom PromQL rules and Slack alerting
Elastic Stack + Kibana for centralized log aggregation across cluster workloads

---

## Projects

ClickHouse MCP Server — Built AI-assisted K8s + database operational tooling with FastMCP  
SOPCTL — Kubernetes-aware incident response automation with Temporal + Slack integration  
MongoDB Platform — Custom operator + 16 TB DocumentDB migration

---

## Education
Bachelor of Science (BS) Degree in Data Science and Applications
Indian Institute of technology, Madras 2023 2027
