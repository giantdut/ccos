## Agent skills

### Issue tracker

Issues live in GitHub Issues (uses the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

---

## Codebase overview

CCOS is a **Next.js 15 (App Router) + SQLite** application. The Operator interacts entirely through the web UI; agents run in-process as background jobs. There is exactly one Brand and one Operator per install (ADR-0001, ADR-0005).

### Key conventions

- All API routes must include `export const runtime = "nodejs"` (no Edge runtime).
- All page components start with `"use client"` — no server components in the UI layer.
- UI uses **Tailwind CSS** only; no component library.
- SQLite access goes through `src/lib/db.ts` (singleton, WAL mode, FK enforcement on).
- Every store module exposes a `_setDb(db | null)` injection point used by in-memory tests.
- Background work runs via the job runner (`src/lib/job-runner.ts`); each job type must be registered with `registerJob()` and imported in `src/app/api/jobs/[id]/stream/route.ts`.

### Directory structure

```
src/
  app/
    api/                          Next.js API routes
      brand-profile/              GET, POST
      content-schedules/          GET, POST; sub-routes: approve, progress, items/[itemId]
      jobs/                       GET list; [id]/stream SSE
      knowledge-uploads/          GET, POST; [id] DELETE
      planning-sessions/          GET, POST; [id] GET
      research-bundles/           [id] GET
      signals/                    GET (aggregates + recent, since= param)
      tasks/                      [id] GET; draft PATCH; approve POST; reject POST; export GET
    brand-profile/page.tsx
    content-schedules/
      page.tsx                    Schedule list
      [id]/page.tsx               Schedule detail (items, approve, tasks)
      [id]/progress/page.tsx      Progress review dashboard
    knowledge/page.tsx
    planning/page.tsx
    research-bundles/[id]/page.tsx
    signals/page.tsx              Owner-only Signal dashboard
    tasks/[id]/page.tsx           Draft review (edit, approve, export)
    layout.tsx                    Root nav
    page.tsx                      Home
    globals.css
  lib/
    db.ts                         SQLite schema bootstrap
    job-runner.ts                 Enqueue/run/stream background jobs
    brand-profile-store.ts        Read/write Brand profile block in CLAUDE.md
    draft-store.ts                CRUD for drafts; Levenshtein edit distance
    internal-source-index.ts      Keyword search over knowledge + approved partitions
    researcher-agent.ts           Claude: web + internal results → ResearchBundle
    schedule-proposer-agent.ts    Claude: ResearchBundle → ProposedScheduleItem[]
    outline-expander-agent.ts     Claude: title + outline → expanded plan
    draft-writer-agent.ts         Claude: expanded plan + brand → full Draft
    schedule-store.ts             CRUD for schedules, items, tasks
    signal-store.ts               record(), listSignals(since?), aggregateSignals(since?)
    web-sources-adapter.ts        Firecrawl calls for YouTube/Reddit/HN/Medium/Substack
    jobs/
      hello-agent.ts              Dev/test job
      planning-session.ts         Research → ResearchBundle
      content-schedule.ts         ResearchBundle → schedule items
      drafting-pipeline.ts        Task outline → ExpandedOutline → Draft (two-step)
    __tests__/
      brand-profile-store.test.ts
      draft-store.test.ts
      internal-source-index.test.ts
      job-runner.test.ts
      schedule-store.test.ts
      signal-store.test.ts
```

### DB schema (all in `src/lib/db.ts`)

| Table | Key columns |
|-------|-------------|
| `jobs` | id, type, status, input, output, error |
| `job_events` | job_id → jobs, event, data |
| `knowledge_uploads` | id, filename, size, content |
| `planning_sessions` | id, topic, job_id, web_sources JSON, include_knowledge, include_approved |
| `research_bundles` | session_id → planning_sessions, content JSON |
| `content_schedules` | id, status (proposed\|approved), bundle_session_id, job_id |
| `schedule_items` | id, schedule_id, title, publish_date, outline, position |
| `tasks` | id, schedule_id, schedule_item_id, title, publish_date, outline, status (pending\|drafting\|in-review\|approved) |
| `drafts` | id, task_id, job_id, expanded_outline, agent_draft, draft_content, edit_distance, status (pending\|expanding\|drafting\|ready\|approved\|failed\|interrupted) |
| `signals` | id, type, payload JSON, created_at |

### Task / Draft lifecycle

```
Content schedule approved
  → one Task per schedule item (status: pending)
  → one drafting-pipeline job per task enqueued
  → draft status: pending → expanding → drafting → ready
  → task status: pending → drafting → in-review
  → Operator edits draft (PATCH /api/tasks/[id]/draft) → edit_distance updated
  → Operator approves (POST /api/tasks/[id]/approve) → draft + task: approved
  → Operator can export as .md (GET /api/tasks/[id]/export)
```

### Signal capture

| Signal | Recorded when |
|--------|--------------|
| `draft_edit` | PATCH `/api/tasks/[id]/draft` — carries `{ taskId, editDistance }` |
| `draft_rejected` | POST `/api/tasks/[id]/reject` — does NOT change task status |
| `schedule_item_rejected` | DELETE `/api/content-schedules/[id]/items/[itemId]` |
| `brand_profile_override` | POST `/api/brand-profile` — carries `{ fields }` |

### Testing

```bash
npm test          # Vitest, all in-memory SQLite, no API keys needed
```

Tests use `_setDb(inMemoryDb)` injection; every test file that touches a store must create its own in-memory DB with the required tables and call `_setDb(null)` in `afterEach`.

### Running locally

```bash
cp .env.example .env          # add ANTHROPIC_API_KEY
npm install
npm run dev                   # http://localhost:3000
```

### Container deploy

```bash
docker-compose up             # Caddy on :80 → Next.js; DB at /data/ccos.db
```

`DATABASE_URL` env var overrides the DB path. Basic-auth is enforced at the Caddy layer (ADR-0008).

### Known gaps (v1)

- No re-run UI for interrupted drafts (server marks them `interrupted` on restart via `markInterruptedDrafts()`).
- No delete-item button in the schedule UI (API exists: `DELETE /api/content-schedules/[id]/items/[itemId]`).
- No reject button in the draft review UI (API exists: `POST /api/tasks/[id]/reject`).
- `/signals` has no additional access guard beyond the Caddy proxy.
- Planning session always creates a new schedule; "extend existing schedule" flow is deferred.
