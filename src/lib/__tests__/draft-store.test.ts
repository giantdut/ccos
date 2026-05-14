import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { randomUUID } from "crypto";
import {
  _setDb,
  createDraft,
  getDraftByTaskId,
  setExpandedOutline,
  saveDraft,
  editDraft,
  approveDraft,
  markInterruptedDrafts,
  levenshtein,
} from "../draft-store";

function createInMemoryDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      input TEXT,
      output TEXT,
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS content_schedules (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'proposed',
      bundle_session_id TEXT,
      job_id TEXT REFERENCES jobs(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS schedule_items (
      id TEXT PRIMARY KEY,
      schedule_id TEXT NOT NULL REFERENCES content_schedules(id),
      title TEXT NOT NULL,
      publish_date TEXT NOT NULL,
      outline TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      schedule_id TEXT NOT NULL REFERENCES content_schedules(id),
      schedule_item_id TEXT NOT NULL REFERENCES schedule_items(id),
      title TEXT NOT NULL,
      publish_date TEXT NOT NULL,
      outline TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id),
      job_id TEXT REFERENCES jobs(id),
      expanded_outline TEXT,
      agent_draft TEXT,
      draft_content TEXT,
      edit_distance INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

function seedDraftJob(db: Database.Database): string {
  const jobId = randomUUID();
  db.prepare(
    `INSERT INTO jobs (id, type, status) VALUES (?, 'drafting-pipeline', 'running')`
  ).run(jobId);
  return jobId;
}

function seedTask(db: Database.Database): string {
  const jobId = randomUUID();
  db.prepare(
    `INSERT INTO jobs (id, type, status) VALUES (?, 'test', 'completed')`
  ).run(jobId);

  const scheduleId = randomUUID();
  db.prepare(
    `INSERT INTO content_schedules (id, job_id) VALUES (?, ?)`
  ).run(scheduleId, jobId);

  const itemId = randomUUID();
  db.prepare(
    `INSERT INTO schedule_items (id, schedule_id, title, publish_date, outline, position)
     VALUES (?, ?, 'Test Item', '2026-06-01', '• point', 0)`
  ).run(itemId, scheduleId);

  const taskId = randomUUID();
  db.prepare(
    `INSERT INTO tasks (id, schedule_id, schedule_item_id, title, publish_date, outline)
     VALUES (?, ?, ?, 'Test Task', '2026-06-01', '• point')`
  ).run(taskId, scheduleId, itemId);

  return taskId;
}

describe("draft-store", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createInMemoryDb();
    _setDb(db);
  });

  afterEach(() => {
    _setDb(null);
    db.close();
  });

  it("createDraft inserts a pending draft", () => {
    const taskId = seedTask(db);
    const jobId = seedDraftJob(db);

    const draft = createDraft(taskId, jobId);

    expect(draft.taskId).toBe(taskId);
    expect(draft.jobId).toBe(jobId);
    expect(draft.status).toBe("pending");
    expect(draft.expandedOutline).toBeNull();
    expect(draft.agentDraft).toBeNull();
    expect(draft.draftContent).toBeNull();
    expect(draft.editDistance).toBe(0);
  });

  it("setExpandedOutline stores outline and transitions to drafting", () => {
    const taskId = seedTask(db);
    createDraft(taskId, seedDraftJob(db));

    setExpandedOutline(taskId, "## Section 1\n• Sub-point");

    const draft = getDraftByTaskId(taskId)!;
    expect(draft.expandedOutline).toBe("## Section 1\n• Sub-point");
    expect(draft.status).toBe("drafting");

    const task = db.prepare(`SELECT status FROM tasks WHERE id = ?`).get(taskId) as { status: string };
    expect(task.status).toBe("drafting");
  });

  it("saveDraft stores agent output and edit distance is 0", () => {
    const taskId = seedTask(db);
    createDraft(taskId, seedDraftJob(db));

    saveDraft(taskId, "This is the agent draft.");

    const draft = getDraftByTaskId(taskId)!;
    expect(draft.agentDraft).toBe("This is the agent draft.");
    expect(draft.draftContent).toBe("This is the agent draft.");
    expect(draft.editDistance).toBe(0);
    expect(draft.status).toBe("ready");

    const task = db.prepare(`SELECT status FROM tasks WHERE id = ?`).get(taskId) as { status: string };
    expect(task.status).toBe("in-review");
  });

  it("editDraft increases edit distance after operator edits", () => {
    const taskId = seedTask(db);
    createDraft(taskId, seedDraftJob(db));
    saveDraft(taskId, "Hello world.");

    editDraft(taskId, "Hello world! Updated.");

    const draft = getDraftByTaskId(taskId)!;
    expect(draft.draftContent).toBe("Hello world! Updated.");
    expect(draft.editDistance).toBeGreaterThan(0);
  });

  it("editDraft keeps edit distance 0 when content is unmodified", () => {
    const taskId = seedTask(db);
    createDraft(taskId, seedDraftJob(db));
    saveDraft(taskId, "Exact content.");

    editDraft(taskId, "Exact content.");

    const draft = getDraftByTaskId(taskId)!;
    expect(draft.editDistance).toBe(0);
  });

  it("approveDraft transitions task and draft to approved", () => {
    const taskId = seedTask(db);
    createDraft(taskId, seedDraftJob(db));
    saveDraft(taskId, "Final draft content.");

    approveDraft(taskId);

    const draft = getDraftByTaskId(taskId)!;
    expect(draft.status).toBe("approved");

    const task = db.prepare(`SELECT status FROM tasks WHERE id = ?`).get(taskId) as { status: string };
    expect(task.status).toBe("approved");
  });

  it("markInterruptedDrafts transitions in-flight drafts to interrupted", () => {
    const taskId1 = seedTask(db);
    const taskId2 = seedTask(db);
    createDraft(taskId1, seedDraftJob(db));
    createDraft(taskId2, seedDraftJob(db));

    db.prepare(`UPDATE drafts SET status = 'expanding' WHERE task_id = ?`).run(taskId1);
    db.prepare(`UPDATE drafts SET status = 'drafting' WHERE task_id = ?`).run(taskId2);

    markInterruptedDrafts();

    const d1 = getDraftByTaskId(taskId1)!;
    const d2 = getDraftByTaskId(taskId2)!;
    expect(d1.status).toBe("interrupted");
    expect(d2.status).toBe("interrupted");
  });
});

describe("levenshtein", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshtein("hello", "hello")).toBe(0);
  });

  it("returns string length for empty other string", () => {
    expect(levenshtein("hello", "")).toBe(5);
    expect(levenshtein("", "world")).toBe(5);
  });

  it("counts single substitution", () => {
    expect(levenshtein("kitten", "sitten")).toBe(1);
  });

  it("handles full replacement", () => {
    expect(levenshtein("abc", "xyz")).toBe(3);
  });
});
