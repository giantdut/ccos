# ADR-0005 — Exactly one Operator per install (v1)

Each CCOS install has exactly one Operator account. There is no user table, no invitation flow, no per-user attribution in Progress review — the Operator is effectively the install.

We considered supporting a small team of Operators (2–10 named users sharing one Brand) because in-house content teams realistically have multiple writers, and we also considered the "defer the decision, design schemas flexibly" approach. We rejected both: the team shape adds login flows, role/permission concepts (who can edit the Brand profile? who can approve Drafts?), per-user activity history, and invitation UX — none free; and "design for both" usually picks the worst defaults for both cases.

Single-Operator pairs naturally with single-tenant (ADR-0001) and per-client deployment (ADR-0003). We will revisit if the first real customer is a multi-Operator team.
