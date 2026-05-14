# ADR-0009 — SQLite is the v1 database

The CCOS uses SQLite as its single relational store for v1 — `jobs`, schedule/task records, Knowledge upload metadata, and signal aggregations all live in one SQLite file mounted inside the container via a Docker volume. No external database service.

We considered Postgres (the default reflex for any production web app). We rejected it for v1: at single-Operator scale (ADR-0005) there is no concurrency pressure SQLite can't handle, no read-replica need, no horizontal-scaling story. SQLite removes one container (no `db` service), one connection-pool concern, one credential to manage, one network hop, and one piece of operational surface the Owner has to monitor. The honest performance ceiling — single-writer serialised writes — is invisible at v1 traffic.

We migrate to Postgres when (a) a customer's corpus + history pushes the SQLite file past hundreds of MB and write contention becomes visible in real Planning/Drafting sessions, (b) multi-Operator support arrives (which itself depends on revisiting ADR-0005), or (c) a feature requires a capability SQLite lacks (e.g., logical replication for backups).
