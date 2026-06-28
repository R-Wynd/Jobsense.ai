# Aravind Ram
Database Reliability Engineer / Database Platform Engineer
Chennai, India | devaravindram@gmail.com | linkedin.com/in/aravindramvjs | https://github.com/r-wynd

---

## Summary
Database Reliability / Platform Engineer with 2+ years building and operating self-hosted database platforms at scale — ClickHouse (60 TB+, 200+ servers) and MongoDB on Kubernetes (EKS) and AWS. Authored a production Go Kubernetes operator, led a Percona → in-house MongoDB operator migration, and executed a 16 TB DocumentDB → MongoDB migration with zero data loss. Owns sharding, backup/PITR, disaster recovery, upgrades, and query performance — improved SELECT performance ~40% and cut CPU throttling ~90%.

---

## Core Skills
Databases : ClickHouse, MongoDB, Amazon DocumentDB, ZooKeeper; sharding, replication, PITR, backup/restore, TTL tiered storage, query optimization, load testing & benchmarking
DB Platform & Operators: Go Kubernetes operators (Percona PSMDB → in-house CSMDB), reconciliation logic, Operator SDK, CRDs, ClickHouse Operator, lifecycle management
Reliability: Cross-region disaster recovery, hourly backups, capacity planning, RCA, 24/7 on-call, SOP authoring
Kubernetes & IaC: EKS, Helm, ArgoCD, Karpenter, Terraform, Docker
AWS: S3 (+ Cross-Region Replication), EC2, EKS, IAM/IRSA, EBS, Lambda, Route53
Languages: Python, Go, Bash, SQL

---

## Experience

### Database Platform Engineer — Freshworks *(2023 – Present)*

Operator Development
Engineered a production Kubernetes operator in Go, leading the full migration from the Percona MongoDB Operator (PSMDB) to an in-house Community MongoDB Operator (CSMDB)
Rewrote reconciliation logic for sharding management, backup workflows, Point-In-Time Recovery (PITR), and resource lifecycle to support internal use cases not covered by Percona
Built integration and E2E test coverage with Jenkins CI pipelines for operator builds and releases

Database Provisioning & Operations
Provisioned and operated ClickHouse clusters at 60 TB+ across 200+ servers and self-hosted MongoDB, standardized with Terraform IaC and ArgoCD GitOps
Automated tenant provisioning with Python-generated manifests (ClickHouse, ZooKeeper, Envoy) into ArgoCD, cutting onboarding from days to minutes (~95% faster)
Owned database lifecycle and upgrades — compatibility review, validation testing, SOPs, coordinated production rollouts with minimal risk

Large-Scale Migration
Led a 16 TB migration from Amazon DocumentDB to self-hosted MongoDB, validating compatibility and data integrity with a zero-loss cutover
Built a remote migration framework using ClickHouse Remote Functions for onboarding external deployments, with automated schema creation and Route53 cutover

Backup, PITR & Disaster Recovery
Designed cross-region DR — S3 Cross-Region Replication, hourly backups, snapshot-based recovery, and automated restore workflows
Implemented PITR for critical production tenants, strengthening business continuity

Performance & Storage Engineering
Improved ClickHouse SELECT query performance ~40% by evaluating and adopting Lazy Materialization
Reduced CPU throttling ~90% via Kubernetes CPU Manager static allocation; conducted insert/query benchmarking to de-risk version upgrades and set capacity baselines
Implemented hot/cold tiered storage (EBS → S3 via TTL policies + local EBS cache), cutting storage cost while preserving query performance

---

## Projects

PSMDB → In-house MongoDB Operator (Go) — custom sharding, backup, and PITR controllers with Jenkins CI
ClickHouse MCP Server — FastMCP/MetaMCP AI tooling for query-pattern analysis and optimization recommendations
Remote Migration Framework — ClickHouse Remote Functions, automated schema creation, Route53 cutover

---

## Education
Bachelor of Science (BS) Degree in Data Science and Applications
Indian Institute of technology, Madras 2023 2027

---

## Certifications
CKAD — Certified Kubernetes Application Developer
