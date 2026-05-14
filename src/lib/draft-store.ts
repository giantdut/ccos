import { randomUUID } from "crypto";
import type Database from "better-sqlite3";

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("./db").default as Database.Database;
}

export function _setDb(db: Database.Database | null): void {
  _db = db;
}

export type DraftStatus =
  | "pending"
  | "expanding"
  | "drafting"
  | "ready"
  | "approved"
  | "failed"
  | "interrupted";

export interface Draft {
  id: string;
  taskId: string;
  jobId: string | null;
  expandedOutline: string | null;
  agentDraft: string | null;
  draftContent: string | null;
  editDistance: number;
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
}

export function createDraft(taskId: string, jobId: string): Draft {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO drafts (id, task_id, job_id, status, created_at, updated_at)
     VALUES (?, ?, ?, 'pending', datetime('now'), datetime('now'))`
  ).run(id, taskId, jobId);
  return getDraftById(id)!;
}

export function getDraftByTaskId(taskId: string): Draft | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM drafts WHERE task_id = ? ORDER BY created_at DESC LIMIT 1`
    )
    .get(taskId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return mapDraftRow(row);
}

function getDraftById(id: string): Draft | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM drafts WHERE id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return mapDraftRow(row);
}

export function setDraftStatus(taskId: string, status: DraftStatus): void {
  const db = getDb();
  db.prepare(
    `UPDATE drafts SET status = ?, updated_at = datetime('now') WHERE task_id = ?`
  ).run(status, taskId);
}

export function setExpandedOutline(
  taskId: string,
  expandedOutline: string
): void {
  const db = getDb();
  db.prepare(
    `UPDATE drafts SET expanded_outline = ?, status = 'drafting', updated_at = datetime('now') WHERE task_id = ?`
  ).run(expandedOutline, taskId);
  db.prepare(
    `UPDATE tasks SET status = 'drafting', updated_at = datetime('now') WHERE id = ?`
  ).run(taskId);
}

export function saveDraft(taskId: string, draftContent: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE drafts SET agent_draft = ?, draft_content = ?, edit_distance = 0, status = 'ready', updated_at = datetime('now') WHERE task_id = ?`
  ).run(draftContent, draftContent, taskId);
  db.prepare(
    `UPDATE tasks SET status = 'in-review', updated_at = datetime('now') WHERE id = ?`
  ).run(taskId);
}

export function editDraft(taskId: string, newContent: string): void {
  const db = getDb();
  const draft = getDraftByTaskId(taskId);
  if (!draft) throw new Error(`Draft not found for task ${taskId}`);
  const distance = levenshtein(draft.agentDraft ?? "", newContent);
  db.prepare(
    `UPDATE drafts SET draft_content = ?, edit_distance = ?, updated_at = datetime('now') WHERE task_id = ?`
  ).run(newContent, distance, taskId);
}

export function approveDraft(taskId: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE drafts SET status = 'approved', updated_at = datetime('now') WHERE task_id = ?`
  ).run(taskId);
  db.prepare(
    `UPDATE tasks SET status = 'approved', updated_at = datetime('now') WHERE id = ?`
  ).run(taskId);
}

export function markDraftFailed(taskId: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE drafts SET status = 'failed', updated_at = datetime('now') WHERE task_id = ?`
  ).run(taskId);
}

export function markInterruptedDrafts(): void {
  const db = getDb();
  db.prepare(
    `UPDATE drafts SET status = 'interrupted', updated_at = datetime('now')
     WHERE status IN ('pending', 'expanding', 'drafting')`
  ).run();
}

function mapDraftRow(row: Record<string, unknown>): Draft {
  return {
    id: row.id as string,
    taskId: row.task_id as string,
    jobId: row.job_id as string | null,
    expandedOutline: row.expanded_outline as string | null,
    agentDraft: row.agent_draft as string | null,
    draftContent: row.draft_content as string | null,
    editDistance: row.edit_distance as number,
    status: row.status as DraftStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const curr = [i];
    for (let j = 1; j <= n; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    prev = curr;
  }
  return prev[n];
}
