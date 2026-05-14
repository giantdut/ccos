# ADR-0004 — Claude Code is the implementation language; the Next.js UI is the product

The CCOS is built as a Claude Code project — `.claude/skills/`, `.claude/agents/`, `.claude/commands/`, `CLAUDE.md`, MCP servers, hooks. But the Operator (a non-technical business user) never invokes `claude` directly. Skills are designed to be called by the Next.js backend exec'ing `claude` and parsing the result, not to be invoked by a human at the terminal.

We considered making skills first-class standalone deliverables — usable both from the backend and from a power user's CLI — which would have opened a separate commercial channel ("sell the skills"). We deferred this because building for two audiences doubles design surface (slash command UX, defaults, help text, error messaging) for no v1 Operator benefit.

Individual skills can be promoted to standalone quality later when a specific reason emerges.
