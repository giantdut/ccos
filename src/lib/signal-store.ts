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

export type SignalType =
  | "draft_rejected"
  | "draft_edit"
  | "schedule_item_rejected"
  | "brand_profile_override";

export interface Signal {
  id: string;
  type: SignalType;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface SignalAggregate {
  type: SignalType;
  count: number;
}

export function record(
  type: SignalType,
  payload: Record<string, unknown>
): Signal {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO signals (id, type, payload, created_at)
     VALUES (?, ?, ?, datetime('now'))`
  ).run(id, type, JSON.stringify(payload));
  return getSignalById(id)!;
}

function getSignalById(id: string): Signal | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM signals WHERE id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  return mapSignalRow(row);
}

export function listSignals(since?: string): Signal[] {
  const db = getDb();
  let rows: Record<string, unknown>[];
  if (since) {
    rows = db
      .prepare(
        `SELECT * FROM signals WHERE created_at >= ? ORDER BY created_at DESC, rowid DESC`
      )
      .all(since) as Record<string, unknown>[];
  } else {
    rows = db
      .prepare(`SELECT * FROM signals ORDER BY created_at DESC, rowid DESC`)
      .all() as Record<string, unknown>[];
  }
  return rows.map(mapSignalRow);
}

export function aggregateSignals(since?: string): SignalAggregate[] {
  const db = getDb();
  let rows: { type: string; count: number }[];
  if (since) {
    rows = db
      .prepare(
        `SELECT type, COUNT(*) as count FROM signals WHERE created_at >= ? GROUP BY type`
      )
      .all(since) as { type: string; count: number }[];
  } else {
    rows = db
      .prepare(`SELECT type, COUNT(*) as count FROM signals GROUP BY type`)
      .all() as { type: string; count: number }[];
  }
  return rows.map((r) => ({ type: r.type as SignalType, count: r.count }));
}

function mapSignalRow(row: Record<string, unknown>): Signal {
  return {
    id: row.id as string,
    type: row.type as SignalType,
    payload: JSON.parse(row.payload as string) as Record<string, unknown>,
    createdAt: row.created_at as string,
  };
}
