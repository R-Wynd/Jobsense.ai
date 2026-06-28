# Aravind Ram
Site Reliability Engineer
Chennai, India | devaravindram@gmail.com | linkedin.com/in/aravindramvjs | https://github.com/r-wynd

---

## Summary
SRE with 2+ years of experience building and operating production-grade infrastructure on AWS. Specialized in Kubernetes platform operations, observability stacks, and GitOps-driven deployment pipelines. Proven track record reducing incidents through proactive alerting, automated runbooks, and structured on-call processes.

---

## Core Skills
SRE & Operations: Incident Management, On-Call, SLO/SLI/Error Budgets, Runbook Automation, Capacity Planning, Chaos Engineering  
Kubernetes: EKS, Karpenter, Helm, ArgoCD, Kustomize, Gatekeeper, ExternalDNS, ALB Controller, ClickHouse Operator  
Observability: Prometheus, Grafana, AlertManager, PromQL, Elastic Stack, Kibana, Haystack, Node Exporter  
IaC & Cloud: Terraform, AWS (EKS, EC2, VPC, IAM, S3, Route53, ACM, ASG), GitOps  
Languages & Tools: Python, Bash, Jenkins, GitHub Actions, Docker, Linux  

---

## Experience

### SRE / Platform Engineer — Freshworks *(2023 – Present)*

Reliability & Incident Response
Owned on-call rotation for ClickHouse platform serving 60 TB of analytics data across 200+ servers
Reduced CPU throttling by ~90% by implementing Kubernetes CPU Manager static policy for ClickHouse workloads
Built SOPCTL incident assistant integrating Slack alerts → Temporal workflows → automated SOP execution → LLM-generated RCA, accelerating incident resolution
Designed DR framework: hourly ClickHouse backups, S3 cross-region replication, automated restore workflows; improved RTO from hours to minutes

Observability
Deployed full observability stack: Prometheus, Grafana dashboards, AlertManager rules (PromQL), Node Exporter, Elastic + Kibana for centralized log aggregation
Integrated Slack alerting for proactive incident detection; reduced MTTD significantly
Built AWS Cost Explorer + Lambda pipeline for per-tenant infrastructure cost visibility

Kubernetes Platform Operations
Provisioned and operated production EKS clusters on AWS with Terraform (VPC, IAM, Route53, ACM, S3, ASG, Security Groups)
Configured ArgoCD GitOps pipelines; deployed Karpenter, Gatekeeper, ExternalDNS, ALB Controller, ClickHouse Operator
Migrated entire deployment framework from Kustomize to Helm; improved maintainability and reduced deployment variance
Optimized ClickHouse SELECT query performance by ~40% through Lazy Materialization evaluation

Automation & CI/CD
Built GitHub Actions workflows for Helm validation, ECR image sync, automated release tagging, ArgoCD deployment updates
Developed Python-based tenant provisioning: dynamic manifest generation for ClickHouse, ZooKeeper, and Envoy; ArgoCD integration eliminated manual onboarding

---

## Projects

ClickHouse MCP Server — Built AI-assisted operational tooling (FastMCP, MetaMCP) for query pattern analysis, Prometheus alert correlation, and optimization recommendations  
MongoDB Platform Migration — Led PSMDB → in-house CSMDB operator migration covering sharding, backup, PITR, lifecycle management; built Jenkins CI pipelines  
DocumentDB → MongoDB — Migrated 16 TB of production data; validated compatibility and data integrity throughout

---

## Education
Bachelor of Science (BS) Degree in Data Science and Applications
Indian Institute of technology, Madras 2023 2027

---

## Certifications
CKAD — Certified Kubernetes Application Developer
