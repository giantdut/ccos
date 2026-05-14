import Database from "better-sqlite3";
import path from "path";

const dbPath =
  process.env.DATABASE_URL ?? path.join(process.cwd(), "ccos.db");

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS migrations (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL UNIQUE,
    applied_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id          TEXT    PRIMARY KEY,
    type        TEXT    NOT NULL,
    status      TEXT    NOT NULL DEFAULT 'pending',
    input       TEXT,
    output      TEXT,
    error       TEXT,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS job_events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id      TEXT    NOT NULL REFERENCES jobs(id),
    event       TEXT    NOT NULL,
    data        TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS knowledge_uploads (
    id          TEXT    PRIMARY KEY,
    filename    TEXT    NOT NULL,
    size        INTEGER NOT NULL,
    content     TEXT    NOT NULL,
    uploaded_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS planning_sessions (
    id                TEXT    PRIMARY KEY,
    topic             TEXT    NOT NULL,
    job_id            TEXT    NOT NULL REFERENCES jobs(id),
    web_sources       TEXT    NOT NULL DEFAULT '[]',
    include_knowledge INTEGER NOT NULL DEFAULT 0,
    include_approved  INTEGER NOT NULL DEFAULT 0,
    created_at        TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS research_bundles (
    session_id  TEXT    PRIMARY KEY REFERENCES planning_sessions(id),
    content     TEXT    NOT NULL,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
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

db.exec(`
  CREATE TABLE IF NOT EXISTS drafts (
    id               TEXT PRIMARY KEY,
    task_id          TEXT NOT NULL REFERENCES tasks(id),
    job_id           TEXT REFERENCES jobs(id),
    expanded_outline TEXT,
    agent_draft      TEXT,
    draft_content    TEXT,
    edit_distance    INTEGER NOT NULL DEFAULT 0,
    status           TEXT NOT NULL DEFAULT 'pending',
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS signals (
    id          TEXT    PRIMARY KEY,
    type        TEXT    NOT NULL,
    payload     TEXT    NOT NULL DEFAULT '{}',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
`);

export default db;
