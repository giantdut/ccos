import { randomUUID } from "crypto";
import type Database from "better-sqlite3";

export type JobHandler = (
  input: unknown,
  emit: (event: string, data: unknown) => void
) => Promise<unknown>;

// Allow injecting a custom db for testing
let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  // Lazy import to avoid issues in test environments
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("./db").default as Database.Database;
}

/** For testing: inject a custom in-memory database */
export function _setDb(db: Database.Database | null): void {
  _db = db;
}

const registry = new Map<string, JobHandler>();

export function registerJob(type: string, handler: JobHandler): void {
  registry.set(type, handler);
}

export function enqueue(type: string, input: unknown): string {
  const db = getDb();
  const id = randomUUID();

  const insert = db.prepare(`
    INSERT INTO jobs (id, type, status, input, created_at, updated_at)
    VALUES (?, ?, 'pending', ?, datetime('now'), datetime('now'))
  `);
  insert.run(id, type, input !== undefined ? JSON.stringify(input) : null);

  // Fire-and-forget
  void runJob(id, type, input);

  return id;
}

async function runJob(id: string, type: string, input: unknown): Promise<void> {
  const db = getDb();

  const handler = registry.get(type);
  if (!handler) {
    db.prepare(`
      UPDATE jobs SET status = 'failed', error = ?, updated_at = datetime('now') WHERE id = ?
    `).run(`No handler registered for job type: ${type}`, id);
    return;
  }

  db.prepare(`
    UPDATE jobs SET status = 'running', updated_at = datetime('now') WHERE id = ?
  `).run(id);

  const emit = (event: string, data: unknown): void => {
    db.prepare(`
      INSERT INTO job_events (job_id, event, data, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(id, event, JSON.stringify(data));
    notifyListeners(id, event, data);
  };

  try {
    const output = await handler(input, emit);
    db.prepare(`
      UPDATE jobs SET status = 'completed', output = ?, updated_at = datetime('now') WHERE id = ?
    `).run(output !== undefined ? JSON.stringify(output) : null, id);
    notifyListeners(id, "done", { status: "completed" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    db.prepare(`
      UPDATE jobs SET status = 'failed', error = ?, updated_at = datetime('now') WHERE id = ?
    `).run(message, id);
    notifyListeners(id, "done", { status: "failed", error: message });
  }
}

export function cancel(id: string): void {
  const db = getDb();
  db.prepare(`
    UPDATE jobs SET status = 'failed', error = 'cancelled', updated_at = datetime('now') WHERE id = ?
  `).run(id);
  notifyListeners(id, "done", { status: "failed", error: "cancelled" });
}

export function markInterruptedJobs(): void {
  const db = getDb();
  db.prepare(`
    UPDATE jobs SET status = 'interrupted', updated_at = datetime('now') WHERE status = 'running'
  `).run();
}

// ─── SSE listener registry ────────────────────────────────────────────────────

type Listener = (event: string, data: unknown) => void;
const listeners = new Map<string, Set<Listener>>();

export function subscribeToJob(id: string, listener: Listener): () => void {
  if (!listeners.has(id)) listeners.set(id, new Set());
  listeners.get(id)!.add(listener);
  return () => {
    listeners.get(id)?.delete(listener);
    if (listeners.get(id)?.size === 0) listeners.delete(id);
  };
}

function notifyListeners(id: string, event: string, data: unknown): void {
  listeners.get(id)?.forEach((fn) => fn(event, data));
}

// ─── Query helpers ────────────────────────────────────────────────────────────

export interface JobRow {
  id: string;
  type: string;
  status: string;
  input: string | null;
  output: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobEventRow {
  id: number;
  job_id: string;
  event: string;
  data: string;
  created_at: string;
}

export function getJob(id: string): JobRow | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as
    | JobRow
    | undefined;
}

export function getJobEvents(jobId: string): JobEventRow[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM job_events WHERE job_id = ? ORDER BY id ASC")
    .all(jobId) as JobEventRow[];
}
