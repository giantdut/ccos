# ADR-0008 — Operator auth is HTTP basic auth at the reverse proxy (v1)

The CCOS app itself is auth-agnostic: any request that reaches it is trusted to be the Operator. Authentication is enforced one layer up by the reverse proxy in front of the container (Caddy, Cloudflare Access, or whatever the deployment target uses). The Owner sets a username/password pair in env vars at deploy time. The Operator's browser handles the native login dialog and credential storage; they sign in once per device and effectively never see auth again.

We considered: a custom password page inside the app, magic-link auth (SMTP-dependent), and OAuth (per-install client setup). All were rejected for v1 because they all add code, dependencies, or per-deployment configuration that the single-Operator model (ADR-0005) does not justify. Basic auth at the proxy is the smallest possible auth surface that still works.

The accepted cost: there is no password reset flow, no account settings page, no per-action audit log of "who did this" (there is only ever one Operator). If the Owner needs to change the password, they redeploy with a new env var. We revisit when multi-Operator support is on the table — that triggers a full auth layer (likely Auth.js / NextAuth) and a user table.
