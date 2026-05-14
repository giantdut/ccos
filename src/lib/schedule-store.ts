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

export type ScheduleStatus = "proposed" | "approved";
export type TaskStatus = "pending" | "drafting" | "in-review" | "approved";

export interface ContentSchedule {
  id: string;
  status: ScheduleStatus;
  bundleSessionId: string | null;
  jobId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleItem {
  id: string;
  scheduleId: string;
  title: string;
  publishDate: string;
  outline: string;
  position: number;
  createdAt: string;
}

export interface Task {
  id: string;
  scheduleId: string;
  scheduleItemId: string;
  title: string;
  publishDate: string;
  outline: string;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
}

export function createSchedule(
  id: string,
  bundleSessionId: string | null,
  jobId: string
): ContentSchedule {
  const db = getDb();
  db.prepare(
    `INSERT INTO content_schedules (id, status, bundle_session_id, job_id, created_at, updated_at)
     VALUES (?, 'proposed', ?, ?, datetime('now'), datetime('now'))`
  ).run(id, bundleSessionId, jobId);
  return getSchedule(id)!;
}

export function addScheduleItems(
  scheduleId: string,
  items: Array<{ title: string; publishDate: string; outline: string }>
): ScheduleItem[] {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT MAX(position) as maxPos FROM schedule_items WHERE schedule_id = ?`
    )
    .get(scheduleId) as { maxPos: number | null };
  let position = (row.maxPos ?? -1) + 1;

  const stmt = db.prepare(
    `INSERT INTO schedule_items (id, schedule_id, title, publish_date, outline, position, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`
  );

  const ids: string[] = [];
  for (const item of items) {
    const id = randomUUID();
    stmt.run(id, scheduleId, item.title, item.publishDate, item.outline, position++);
    ids.push(id);
  }

  return ids.map((id) => getScheduleItem(id)!);
}

export function approveSchedule(scheduleId: string): Task[] {
  const db = getDb();
  const schedule = getSchedule(scheduleId);
  if (!schedule) throw new Error(`Schedule ${scheduleId} not found`);
  if (schedule.status === "approved")
    throw new Error(`Schedule ${scheduleId} is already approved`);

  db.prepare(
    `UPDATE content_schedules SET status = 'approved', updated_at = datetime('now') WHERE id = ?`
  ).run(scheduleId);

  const items = getScheduleItems(scheduleId);
  const stmt = db.prepare(
    `INSERT INTO tasks (id, schedule_id, schedule_item_id, title, publish_date, outline, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))`
  );

  const taskIds: string[] = [];
  for (const item of items) {
    const id = randomUUID();
    stmt.run(id, scheduleId, item.id, item.title, item.publishDate, item.outline);
    taskIds.push(id);
  }

  return taskIds.map((id) => getTask(id)!);
}

export function getSchedule(id: string): ContentSchedule | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM content_schedules WHERE id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return mapScheduleRow(row);
}

export function listSchedules(): ContentSchedule[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM content_schedules ORDER BY created_at DESC`)
    .all() as Record<string, unknown>[];
  return rows.map(mapScheduleRow);
}

export function getScheduleItems(scheduleId: string): ScheduleItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM schedule_items WHERE schedule_id = ? ORDER BY position ASC`
    )
    .all(scheduleId) as Record<string, unknown>[];
  return rows.map(mapItemRow);
}

export function getTasksForSchedule(scheduleId: string): Task[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM tasks WHERE schedule_id = ? ORDER BY created_at ASC`
    )
    .all(scheduleId) as Record<string, unknown>[];
  return rows.map(mapTaskRow);
}

export function deleteScheduleItem(
  scheduleId: string,
  itemId: string
): boolean {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id FROM schedule_items WHERE id = ? AND schedule_id = ?`
    )
    .get(itemId, scheduleId) as { id: string } | undefined;
  if (!row) return false;
  db.prepare(`DELETE FROM schedule_items WHERE id = ?`).run(itemId);
  return true;
}

function getScheduleItem(id: string): ScheduleItem | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM schedule_items WHERE id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return mapItemRow(row);
}

export function getTask(id: string): Task | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM tasks WHERE id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return mapTaskRow(row);
}

function mapScheduleRow(row: Record<string, unknown>): ContentSchedule {
  return {
    id: row.id as string,
    status: row.status as ScheduleStatus,
    bundleSessionId: row.bundle_session_id as string | null,
    jobId: row.job_id as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function mapItemRow(row: Record<string, unknown>): ScheduleItem {
  return {
    id: row.id as string,
    scheduleId: row.schedule_id as string,
    title: row.title as string,
    publishDate: row.publish_date as string,
    outline: row.outline as string,
    position: row.position as number,
    createdAt: row.created_at as string,
  };
}

function mapTaskRow(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    scheduleId: row.schedule_id as string,
    scheduleItemId: row.schedule_item_id as string,
    title: row.title as string,
    publishDate: row.publish_date as string,
    outline: row.outline as string,
    status: row.status as TaskStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
