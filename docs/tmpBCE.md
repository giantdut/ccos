# Handoff — CCOS v1 Implementation

## What this project is

CCOS (Content Operations Claude Code Operating System) — a single-tenant, containerised Next.js web app that wraps Claude Agent SDK into a content production workflow for a non-technical Operator. Full domain model and architecture are in:

- `CONTEXT.md` — domain glossary (Brand, Operator, Topic, Planning session, Research bundle, Content schedule, Task, Draft, etc.)
- `docs/adr/0001–0009.md` — all foundational architectural decisions (single-tenant, SQLite, no serverless, Caddy basic-auth, in-process jobs, keyword-only retrieval, etc.)
- GitHub issue #1 — PRD with full user stories, module specs, and test decisions

## Repo

`C:\Users\aryow\Documents\CCOS` · GitHub: `giantdut/ccos` · branch: `main`

## What has been completed

| Issue | Title | Status |
|-------|-------|--------|
| #2 | App shell: Next.js + SQLite + Caddy + Docker | Closed |
| #3 | Job runner, jobs table, SSE streaming | Closed |
| #4 | Brand profile UI ↔ root CLAUDE.md | Closed |
| #5 | Knowledge uploads + Internal source index | Closed |
| #6 | Planning session: Topic → Research bundle (web sources) | Closed |
| #7 | Planning session: Internal sources toggle | Closed |
| #8 | Content schedule: proposal → Operator approval → Tasks | Closed |

### What exists in the codebase

```
src/
  app/
    api/
      brand-profile/route.ts
      jobs/route.ts
      jobs/[id]/stream/route.ts
      knowledge-uploads/route.ts
      knowledge-uploads/[id]/route.ts
      planning-sessions/route.ts
      planning-sessions/[id]/route.ts
      research-bundles/[id]/route.ts
      content-schedules/route.ts              GET list / POST create-or-extend
      content-schedules/[id]/route.ts         GET single with items + tasks
      content-schedules/[id]/approve/route.ts POST approve
    brand-profile/page.tsx
    knowledge/page.tsx
    planning/page.tsx
    research-bundles/[id]/page.tsx            Includes "Propose Content Schedule" button
    content-schedules/page.tsx                Schedule list
    content-schedules/[id]/page.tsx           Proposal progress (SSE) + review + approve
    layout.tsx                                Nav: Home, Brand Profile, Knowledge, Planning, Schedules
    page.tsx
  lib/
    db.ts                                     SQLite singleton; tables include:
                                              migrations, jobs, job_events, knowledge_uploads,
                                              planning_sessions, research_bundles,
                                              content_schedules, schedule_items, tasks
    brand-profile-store.ts
    internal-source-index.ts
    job-runner.ts
    researcher-agent.ts
    web-sources-adapter.ts
    schedule-store.ts                         State machine: createSchedule, addScheduleItems,
                                              approveSchedule, listSchedules, getTasksForSchedule
    schedule-proposer-agent.ts                Claude call → ProposedScheduleItem[]
    jobs/
      hello-agent.ts
      planning-session.ts
      content-schedule.ts                     "content-schedule" job handler
  instrumentation.ts
  lib/__tests__/
    brand-profile-store.test.ts
    internal-source-index.test.ts
    job-runner.test.ts
    schedule-store.test.ts                    6 tests (added this session)
```

**22/22 unit tests passing** (`npm test`). TypeScript clean.

### Task state machine (established in #8)

- Tasks: `pending → drafting → in-review → approved`
- Schedules: `proposed → approved`

Illegal transitions are rejected with a clear error. `approveSchedule()` throws `"already approved"` if called twice; route returns 409.

**Key env vars needed at runtime:**
- `DATABASE_URL` — path to SQLite file (default: `./ccos.db`)
- `FIRECRAWL_API_KEY` — for web source fetching in Planning sessions
- `ANTHROPIC_API_KEY` — for Claude synthesis
- `OPERATOR_USER` / `OPERATOR_PASS_HASH` — Caddy basic auth credentials
- `BRAND_PROFILE_PATH` — path to CLAUDE.md (default: `./CLAUDE.md`)
- `UPLOADS_DIR` — path for Knowledge upload files (default: `./uploads`)

## What remains (open issues)

Dependency order:

```
#9  Drafting pipeline: Task → Expanded outline → Draft (two-step agent)
      ↓
#10 Draft review: edit, approve, export
      ↓
#11 Approved content as Internal source (auto-index on approval)
#13 Signal capture + Owner-only Signal dashboard

#12 Progress review: per-Schedule Task status dashboard
    (depends on #8 ✓ — Tasks now exist, can start)
```

**#9 is the logical next step.**

## Key patterns to follow

1. **Job types**: Register in `src/lib/jobs/*.ts`, import side-effectfully in the API route that uses them.

2. **SSE**: Routes use `ReadableStream` + `subscribeToJob()`. Always `export const runtime = "nodejs"`. Replay stored events first, then subscribe live. Client connects to the generic `/api/jobs/${jobId}/stream`.

3. **DB tables**: Add `CREATE TABLE IF NOT EXISTS` blocks to `src/lib/db.ts` after existing ones. Idempotent DDL only. No migration framework.

4. **Tests**: Vitest, real in-memory SQLite (`new Database(":memory:")`). Use `_setDb()` escape hatch. Never mock the DB.

5. **API routes**: `export const runtime = "nodejs"`. Return `NextResponse.json(...)`. No auth in app (Caddy handles it).

6. **Claude calls**: `@anthropic-ai/sdk` directly (model: `claude-sonnet-4-6`). Not the Agent SDK.

7. **Pre-generating IDs**: When a job needs a record ID as input (e.g. `scheduleId`), generate it with `randomUUID()` in the route before `enqueue()`, pass it in the job input, then insert the DB record after `enqueue()` returns. FK-constrained writes in the job handler only happen after the first Claude `await`, so the record is always present by then. See `src/app/api/content-schedules/route.ts` for the pattern.

## #9 spec summary (from GitHub issue)

The Drafting pipeline is a **two-step agent** job triggered from a Task:

1. **Outline expander** — reads the Task's Outline (inherited from Schedule item) and produces an **Expanded outline**: structural plan with sections, sub-points, and source references. Persisted. No Operator gate between steps.
2. **Draft writer** — reads the Expanded outline and produces the **Draft**. Persisted.

Task status transitions: `pending → drafting` when job starts. Draft is stored and Task stays in `drafting` until #10 (Draft review).

New DB tables needed: `expanded_outlines` and `drafts` (or combined — check the full issue spec).

## Notes on agents

Worktree-isolated agents are blocked from running shell commands (npm install, gh). Files are written correctly but tests and issue-closing must be handled by the orchestrator. If spawning agents: **"Use Write/Edit/Read tools only. Do not use Bash. Do not try to run npm or gh commands. The orchestrator will handle those after you finish writing files."**

## Suggested skills for next session

- `/triage` — to pick up and verify #9 before starting
- No special skills needed for #9 — standard Next.js + SQLite + Vitest + Anthropic SDK pattern
