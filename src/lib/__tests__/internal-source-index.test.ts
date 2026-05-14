import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { createIndex } from "../internal-source-index";

function makeDb() {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_uploads (
      id          TEXT    PRIMARY KEY,
      filename    TEXT    NOT NULL,
      size        INTEGER NOT NULL,
      content     TEXT    NOT NULL,
      uploaded_at TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id               TEXT PRIMARY KEY,
      schedule_id      TEXT NOT NULL,
      schedule_item_id TEXT NOT NULL,
      title            TEXT NOT NULL,
      publish_date     TEXT NOT NULL,
      outline          TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'pending',
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS drafts (
      id               TEXT PRIMARY KEY,
      task_id          TEXT NOT NULL REFERENCES tasks(id),
      job_id           TEXT,
      expanded_outline TEXT,
      agent_draft      TEXT,
      draft_content    TEXT,
      edit_distance    INTEGER NOT NULL DEFAULT 0,
      status           TEXT NOT NULL DEFAULT 'pending',
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

function insert(
  db: Database.Database,
  id: string,
  filename: string,
  content: string
) {
  db.prepare(
    "INSERT INTO knowledge_uploads (id, filename, size, content) VALUES (?, ?, ?, ?)"
  ).run(id, filename, content.length, content);
}

describe("internal-source-index", () => {
  let db: Database.Database;
  let index: ReturnType<typeof createIndex>;

  beforeEach(() => {
    db = makeDb();
    index = createIndex(db);
  });

  it("returns relevant results for a matching query", () => {
    insert(db, "1", "doc.txt", "The quick brown fox jumps over the lazy dog");
    const results = index.search("fox", ["knowledge"]);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("1");
    expect(results[0].partition).toBe("knowledge");
    expect(results[0].score).toBeGreaterThan(0);
    expect(results[0].snippet).toContain("fox");
  });

  it("returns empty array for a query with no matches", () => {
    insert(db, "1", "doc.txt", "Hello world");
    const results = index.search("zebra", ["knowledge"]);
    expect(results).toHaveLength(0);
  });

  it("respects partition filter: knowledge doc does not appear in approved-only search", () => {
    insert(db, "1", "doc.txt", "The quick brown fox jumps over the lazy dog");
    const results = index.search("fox", ["approved"]);
    expect(results).toHaveLength(0);
  });

  it("ranks a doc with more term occurrences above one with fewer", () => {
    insert(db, "low", "low.txt", "cat");
    insert(db, "high", "high.txt", "cat cat cat cat cat");
    const results = index.search("cat", ["knowledge"]);
    expect(results[0].id).toBe("high");
    expect(results[1].id).toBe("low");
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("ranking order is deterministic for equal scores (id ascending)", () => {
    insert(db, "b-doc", "b.txt", "alpha");
    insert(db, "a-doc", "a.txt", "alpha");
    const results = index.search("alpha", ["knowledge"]);
    expect(results[0].id).toBe("a-doc");
    expect(results[1].id).toBe("b-doc");
  });

  it("stop words are ignored and searching only for stop words returns empty", () => {
    insert(db, "1", "doc.txt", "the quick brown fox and the lazy dog");
    const results = index.search("the and", ["knowledge"]);
    expect(results).toHaveLength(0);
  });
});
