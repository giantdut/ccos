import type Database from "better-sqlite3";

export type Partition = "knowledge" | "approved";

export type RankedResult = {
  id: string;
  partition: Partition;
  filename: string;
  snippet: string;
  score: number;
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "in",
  "on",
  "of",
  "is",
  "it",
  "to",
  "for",
  "and",
  "or",
  "but",
  "not",
  "with",
  "that",
  "this",
  "at",
  "by",
  "from",
  "as",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}

function buildSnippet(content: string, tokens: string[]): string {
  const lower = content.toLowerCase();
  let firstIndex = -1;
  for (const token of tokens) {
    const idx = lower.indexOf(token);
    if (idx !== -1 && (firstIndex === -1 || idx < firstIndex)) {
      firstIndex = idx;
    }
  }
  if (firstIndex === -1) return content.slice(0, 200);
  const start = Math.max(0, firstIndex - 50);
  return content.slice(start, start + 200);
}

function countScore(content: string, tokens: string[]): number {
  const lower = content.toLowerCase();
  let score = 0;
  for (const token of tokens) {
    let pos = 0;
    while (true) {
      const idx = lower.indexOf(token, pos);
      if (idx === -1) break;
      score++;
      pos = idx + token.length;
    }
  }
  return score;
}

export function createIndex(db: Database.Database) {
  function search(query: string, partitions: Partition[]): RankedResult[] {
    const tokens = tokenize(query);
    if (tokens.length === 0) return [];

    const results: RankedResult[] = [];

    if (partitions.includes("knowledge")) {
      type Row = { id: string; filename: string; content: string };
      const rows = db
        .prepare("SELECT id, filename, content FROM knowledge_uploads")
        .all() as Row[];

      for (const row of rows) {
        const score = countScore(row.content, tokens);
        if (score > 0) {
          results.push({
            id: row.id,
            partition: "knowledge",
            filename: row.filename,
            snippet: buildSnippet(row.content, tokens),
            score,
          });
        }
      }
    }

    if (partitions.includes("approved")) {
      type ApprovedRow = { id: string; title: string; draft_content: string };
      const rows = db
        .prepare(
          `SELECT d.task_id AS id, t.title, d.draft_content
           FROM drafts d
           JOIN tasks t ON d.task_id = t.id
           WHERE d.status = 'approved' AND d.draft_content IS NOT NULL`
        )
        .all() as ApprovedRow[];

      for (const row of rows) {
        const score = countScore(row.draft_content, tokens);
        if (score > 0) {
          results.push({
            id: row.id,
            partition: "approved",
            filename: row.title,
            snippet: buildSnippet(row.draft_content, tokens),
            score,
          });
        }
      }
    }

    results.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    });

    return results;
  }

  return { search };
}

// Singleton convenience export backed by the shared db
let _defaultIndex: ReturnType<typeof createIndex> | null = null;

export function getDefaultIndex(): ReturnType<typeof createIndex> {
  if (!_defaultIndex) {
    const db = require("./db").default as Database.Database;
    _defaultIndex = createIndex(db);
  }
  return _defaultIndex;
}

export function search(
  query: string,
  partitions: Partition[]
): RankedResult[] {
  return getDefaultIndex().search(query, partitions);
}
