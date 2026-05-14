import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import {
  _setDb,
  enqueue,
  cancel,
  markInterruptedJobs,
  registerJob,
  getJob,
} from "../job-runner";

function createInMemoryDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

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

  return db;
}

// Helper: wait until job reaches a non-pending/non-running status
async function waitForTerminal(
  id: string,
  timeoutMs = 10000
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const job = getJob(id);
    if (
      job &&
      job.status !== "pending" &&
      job.status !== "running"
    ) {
      return job.status;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("Timed out waiting for terminal status");
}

// Helper: wait for job to reach 'running' status
async function waitForRunning(id: string, timeoutMs = 5000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const job = getJob(id);
    if (job && job.status === "running") return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error("Timed out waiting for running status");
}

describe("job-runner", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createInMemoryDb();
    _setDb(db);
  });

  afterEach(() => {
    _setDb(null);
    db.close();
  });

  it("enqueue transitions the row to 'running' after the async tick", async () => {
    // Register a handler that resolves slowly
    registerJob("test-running", async () => {
      await new Promise((r) => setTimeout(r, 200));
      return { done: true };
    });

    const id = enqueue("test-running", { foo: "bar" });

    // Immediately after enqueue, job should be 'pending' or already 'running'
    // (running transition happens in the same microtask in runJob)
    // Wait for it to be running
    await waitForRunning(id);

    const job = getJob(id);
    expect(job?.status).toBe("running");
  });

  it("a completing handler transitions the row to 'completed'", async () => {
    registerJob("test-complete", async (_input, emit) => {
      emit("progress", { step: 1 });
      return { result: "ok" };
    });

    const id = enqueue("test-complete", null);
    const status = await waitForTerminal(id);

    expect(status).toBe("completed");

    const job = getJob(id);
    expect(job?.output).toBeDefined();
    const output = JSON.parse(job!.output!);
    expect(output).toEqual({ result: "ok" });
  });

  it("cancel transitions the row to 'failed' with error 'cancelled'", () => {
    // Insert a job manually so we can cancel it in pending state
    db.prepare(`
      INSERT INTO jobs (id, type, status, created_at, updated_at)
      VALUES ('cancel-test-id', 'noop', 'pending', datetime('now'), datetime('now'))
    `).run();

    cancel("cancel-test-id");

    const job = getJob("cancel-test-id");
    expect(job?.status).toBe("failed");
    expect(job?.error).toBe("cancelled");
  });

  it("markInterruptedJobs transitions any 'running' row to 'interrupted'", () => {
    // Insert two running jobs directly
    db.prepare(`
      INSERT INTO jobs (id, type, status, created_at, updated_at)
      VALUES ('running-job-1', 'noop', 'running', datetime('now'), datetime('now'))
    `).run();
    db.prepare(`
      INSERT INTO jobs (id, type, status, created_at, updated_at)
      VALUES ('running-job-2', 'noop', 'running', datetime('now'), datetime('now'))
    `).run();
    // A completed job should remain completed
    db.prepare(`
      INSERT INTO jobs (id, type, status, created_at, updated_at)
      VALUES ('completed-job', 'noop', 'completed', datetime('now'), datetime('now'))
    `).run();

    markInterruptedJobs();

    expect(getJob("running-job-1")?.status).toBe("interrupted");
    expect(getJob("running-job-2")?.status).toBe("interrupted");
    expect(getJob("completed-job")?.status).toBe("completed");
  });
});
