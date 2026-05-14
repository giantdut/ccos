import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { _setDb, record, listSignals, aggregateSignals } from "../signal-store";

function createInMemoryDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS signals (
      id          TEXT    PRIMARY KEY,
      type        TEXT    NOT NULL,
      payload     TEXT    NOT NULL DEFAULT '{}',
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

describe("signal-store", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createInMemoryDb();
    _setDb(db);
  });

  afterEach(() => {
    _setDb(null);
    db.close();
  });

  it("record() inserts a signal and returns it", () => {
    const signal = record("draft_edit", { taskId: "task-1", editDistance: 5 });

    expect(signal.id).toBeDefined();
    expect(signal.type).toBe("draft_edit");
    expect(signal.payload).toEqual({ taskId: "task-1", editDistance: 5 });
    expect(signal.createdAt).toBeDefined();
  });

  it("record() inserts multiple signals that can be retrieved", () => {
    record("draft_edit", { taskId: "t1" });
    record("draft_rejected", { taskId: "t2" });

    const signals = listSignals();
    expect(signals).toHaveLength(2);
  });

  it("listSignals() returns signals newest first", async () => {
    // Insert first signal
    record("draft_edit", { taskId: "t1" });
    // Small delay so timestamps differ
    await new Promise((r) => setTimeout(r, 10));
    record("draft_rejected", { taskId: "t2" });

    const signals = listSignals();
    expect(signals[0].type).toBe("draft_rejected");
    expect(signals[1].type).toBe("draft_edit");
  });

  it("listSignals(since) filters signals within the time window", () => {
    // Insert a signal with an old timestamp directly
    db.prepare(
      `INSERT INTO signals (id, type, payload, created_at)
       VALUES ('old-signal', 'draft_edit', '{}', datetime('now', '-60 days'))`
    ).run();

    // Insert a recent signal via record()
    record("brand_profile_override", { fields: ["mission"] });

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceStr = since.toISOString().replace("T", " ").slice(0, 19);

    const signals = listSignals(sinceStr);
    expect(signals.some((s) => s.id === "old-signal")).toBe(false);
    expect(signals.some((s) => s.type === "brand_profile_override")).toBe(true);
  });

  it("aggregateSignals() returns correct counts per type", () => {
    record("draft_edit", { taskId: "t1" });
    record("draft_edit", { taskId: "t2" });
    record("draft_edit", { taskId: "t3" });
    record("draft_rejected", { taskId: "t4" });

    const agg = aggregateSignals();
    const editAgg = agg.find((a) => a.type === "draft_edit");
    const rejectedAgg = agg.find((a) => a.type === "draft_rejected");

    expect(editAgg?.count).toBe(3);
    expect(rejectedAgg?.count).toBe(1);
  });

  it("aggregateSignals(since) filters by time window", () => {
    // Insert old signal directly
    db.prepare(
      `INSERT INTO signals (id, type, payload, created_at)
       VALUES ('old-agg', 'schedule_item_rejected', '{}', datetime('now', '-90 days'))`
    ).run();

    record("draft_edit", { taskId: "t1" });

    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceStr = since.toISOString().replace("T", " ").slice(0, 19);

    const agg = aggregateSignals(sinceStr);
    const rejected = agg.find((a) => a.type === "schedule_item_rejected");
    expect(rejected).toBeUndefined();

    const editAgg = agg.find((a) => a.type === "draft_edit");
    expect(editAgg?.count).toBe(1);
  });

  it("multiple signal types aggregate independently", () => {
    record("draft_edit", {});
    record("draft_edit", {});
    record("draft_rejected", {});
    record("schedule_item_rejected", {});
    record("schedule_item_rejected", {});
    record("schedule_item_rejected", {});
    record("brand_profile_override", { fields: [] });

    const agg = aggregateSignals();
    const map = new Map(agg.map((a) => [a.type, a.count]));

    expect(map.get("draft_edit")).toBe(2);
    expect(map.get("draft_rejected")).toBe(1);
    expect(map.get("schedule_item_rejected")).toBe(3);
    expect(map.get("brand_profile_override")).toBe(1);
  });
});
