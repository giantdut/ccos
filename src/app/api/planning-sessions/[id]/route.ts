import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import type { WebSource } from "@/lib/web-sources-adapter";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  type Row = {
    id: string;
    topic: string;
    job_id: string;
    web_sources: string;
    include_knowledge: number;
    include_approved: number;
    created_at: string;
    status: string;
  };

  const row = db
    .prepare(
      `SELECT ps.*, j.status
       FROM planning_sessions ps
       JOIN jobs j ON j.id = ps.job_id
       WHERE ps.id = ?`
    )
    .get(id) as Row | undefined;

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    id: row.id,
    topic: row.topic,
    jobId: row.job_id,
    webSources: JSON.parse(row.web_sources) as WebSource[],
    includeKnowledge: row.include_knowledge === 1,
    includeApproved: row.include_approved === 1,
    createdAt: row.created_at,
    status: row.status,
  });
}
