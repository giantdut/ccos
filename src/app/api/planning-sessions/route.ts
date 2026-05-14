import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import db from "@/lib/db";
import { enqueue } from "@/lib/job-runner";
import type { WebSource } from "@/lib/web-sources-adapter";
import type { PlanningSessionInput } from "@/lib/jobs/planning-session";
import "@/lib/jobs/planning-session";

export const runtime = "nodejs";

export async function GET() {
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

  const rows = db
    .prepare(
      `SELECT ps.*, j.status
       FROM planning_sessions ps
       JOIN jobs j ON j.id = ps.job_id
       ORDER BY ps.created_at DESC`
    )
    .all() as Row[];

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      topic: r.topic,
      jobId: r.job_id,
      webSources: JSON.parse(r.web_sources) as WebSource[],
      includeKnowledge: r.include_knowledge === 1,
      includeApproved: r.include_approved === 1,
      createdAt: r.created_at,
      status: r.status,
    }))
  );
}

export async function POST(req: NextRequest) {
  let body: {
    topic?: unknown;
    webSources?: unknown;
    includeKnowledge?: unknown;
    includeApproved?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.topic || typeof body.topic !== "string" || !body.topic.trim()) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
  }

  const topic = body.topic.trim();
  const webSources = Array.isArray(body.webSources)
    ? (body.webSources as WebSource[])
    : [];
  const includeKnowledge = body.includeKnowledge === true;
  const includeApproved = body.includeApproved === true;

  const sessionId = randomUUID();

  const input: PlanningSessionInput = {
    sessionId,
    topic,
    webSources,
    includeKnowledge,
    includeApproved,
  };

  const jobId = enqueue("planning-session", input);

  db.prepare(
    `INSERT INTO planning_sessions
       (id, topic, job_id, web_sources, include_knowledge, include_approved)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    sessionId,
    topic,
    jobId,
    JSON.stringify(webSources),
    includeKnowledge ? 1 : 0,
    includeApproved ? 1 : 0
  );

  return NextResponse.json({ sessionId, jobId }, { status: 201 });
}
