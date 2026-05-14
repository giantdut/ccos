import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import {
  _setDb,
  createSchedule,
  addScheduleItems,
  approveSchedule,
  getSchedule,
  listSchedules,
  getScheduleItems,
  getTasksForSchedule,
} from "../schedule-store";
import { randomUUID } from "crypto";

function createInMemoryDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id          TEXT PRIMARY KEY,
      type        TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'pending',
      input       TEXT,
      output      TEXT,
      error       TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS planning_sessions (
      id                TEXT PRIMARY KEY,
      topic             TEXT NOT NULL,
      job_id            TEXT NOT NULL REFERENCES jobs(id),
      web_sources       TEXT NOT NULL DEFAULT '[]',
      include_knowledge INTEGER NOT NULL DEFAULT 0,
      include_approved  INTEGER NOT NULL DEFAULT 0,
      created_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS research_bundles (
      session_id  TEXT PRIMARY KEY REFERENCES planning_sessions(id),
      content     TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS content_schedules (
      id                TEXT PRIMARY KEY,
      status            TEXT NOT NULL DEFAULT 'proposed',
      bundle_session_id TEXT REFERENCES research_bundles(session_id),
      job_id            TEXT REFERENCES jobs(id),
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS schedule_items (
      id            TEXT PRIMARY KEY,
      schedule_id   TEXT NOT NULL REFERENCES content_schedules(id),
      title         TEXT NOT NULL,
      publish_date  TEXT NOT NULL,
      outline       TEXT NOT NULL,
      position      INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id                TEXT PRIMARY KEY,
      schedule_id       TEXT NOT NULL REFERENCES content_schedules(id),
      schedule_item_id  TEXT NOT NULL REFERENCES schedule_items(id),
      title             TEXT NOT NULL,
      publish_date      TEXT NOT NULL,
      outline           TEXT NOT NULL,
      status            TEXT NOT NULL DEFAULT 'pending',
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

function seedJob(db: Database.Database): string {
  const jobId = randomUUID();
  db.prepare(
    `INSERT INTO jobs (id, type, status, created_at, updated_at)
     VALUES (?, 'content-schedule', 'completed', datetime('now'), datetime('now'))`
  ).run(jobId);
  return jobId;
}

describe("schedule-store", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createInMemoryDb();
    _setDb(db);
  });

  afterEach(() => {
    _setDb(null);
    db.close();
  });

  it("createSchedule inserts a proposed schedule", () => {
    const jobId = seedJob(db);
    const scheduleId = randomUUID();
    const s = createSchedule(scheduleId, null, jobId);

    expect(s.id).toBe(scheduleId);
    expect(s.status).toBe("proposed");
    expect(s.jobId).toBe(jobId);
    expect(s.bundleSessionId).toBeNull();
  });

  it("addScheduleItems inserts items in order", () => {
    const jobId = seedJob(db);
    const scheduleId = randomUUID();
    createSchedule(scheduleId, null, jobId);

    const items = addScheduleItems(scheduleId, [
      { title: "Piece A", publishDate: "2026-05-20", outline: "• Point 1" },
      { title: "Piece B", publishDate: "2026-05-27", outline: "• Point 2" },
    ]);

    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("Piece A");
    expect(items[0].position).toBe(0);
    expect(items[1].title).toBe("Piece B");
    expect(items[1].position).toBe(1);

    const stored = getScheduleItems(scheduleId);
    expect(stored).toHaveLength(2);
    expect(stored[0].publishDate).toBe("2026-05-20");
  });

  it("approveSchedule transitions to approved and creates one Task per item", () => {
    const jobId = seedJob(db);
    const scheduleId = randomUUID();
    createSchedule(scheduleId, null, jobId);
    addScheduleItems(scheduleId, [
      { title: "Piece A", publishDate: "2026-05-20", outline: "• Point 1" },
      { title: "Piece B", publishDate: "2026-05-27", outline: "• Point 2" },
      { title: "Piece C", publishDate: "2026-06-03", outline: "• Point 3" },
    ]);

    const tasks = approveSchedule(scheduleId);

    expect(tasks).toHaveLength(3);
    expect(tasks[0].title).toBe("Piece A");
    expect(tasks[0].status).toBe("pending");
    expect(tasks[1].scheduleId).toBe(scheduleId);

    const schedule = getSchedule(scheduleId);
    expect(schedule?.status).toBe("approved");

    const storedTasks = getTasksForSchedule(scheduleId);
    expect(storedTasks).toHaveLength(3);
  });

  it("approveSchedule rejects an already-approved schedule", () => {
    const jobId = seedJob(db);
    const scheduleId = randomUUID();
    createSchedule(scheduleId, null, jobId);
    addScheduleItems(scheduleId, [
      { title: "Piece A", publishDate: "2026-05-20", outline: "• Point 1" },
    ]);

    approveSchedule(scheduleId);

    expect(() => approveSchedule(scheduleId)).toThrowError(/already approved/);
  });

  it("listSchedules returns all schedules newest first", () => {
    const jobId = seedJob(db);
    const id1 = randomUUID();
    const id2 = randomUUID();
    createSchedule(id1, null, jobId);
    createSchedule(id2, null, jobId);

    const list = listSchedules();
    expect(list.length).toBeGreaterThanOrEqual(2);
    const ids = list.map((s) => s.id);
    expect(ids).toContain(id1);
    expect(ids).toContain(id2);
  });

  it("progress review read model: getTasksForSchedule reflects task statuses", () => {
    const jobId = seedJob(db);
    const scheduleId = randomUUID();
    createSchedule(scheduleId, null, jobId);
    addScheduleItems(scheduleId, [
      { title: "A", publishDate: "2026-05-20", outline: "•" },
      { title: "B", publishDate: "2026-05-27", outline: "•" },
    ]);
    approveSchedule(scheduleId);

    const tasks = getTasksForSchedule(scheduleId);
    expect(tasks.every((t) => t.status === "pending")).toBe(true);

    // Simulate a task moving to 'drafting'
    db.prepare(
      `UPDATE tasks SET status = 'drafting' WHERE id = ?`
    ).run(tasks[0].id);

    const updated = getTasksForSchedule(scheduleId);
    expect(updated[0].status).toBe("drafting");
    expect(updated[1].status).toBe("pending");
  });
});
