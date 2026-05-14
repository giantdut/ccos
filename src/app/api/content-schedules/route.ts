import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import db from "@/lib/db";
import { createSchedule, getSchedule, listSchedules } from "@/lib/schedule-store";
import { enqueue } from "@/lib/job-runner";
import type { ContentScheduleInput } from "@/lib/jobs/content-schedule";
import "@/lib/jobs/content-schedule";

export const runtime = "nodejs";

export async function GET() {
  const schedules = listSchedules();
  return NextResponse.json(schedules);
}

export async function POST(req: NextRequest) {
  let body: { bundleSessionId?: unknown; existingScheduleId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.bundleSessionId || typeof body.bundleSessionId !== "string") {
    return NextResponse.json(
      { error: "bundleSessionId is required" },
      { status: 400 }
    );
  }

  const bundleSessionId = body.bundleSessionId;
  const existingScheduleId =
    typeof body.existingScheduleId === "string"
      ? body.existingScheduleId
      : null;

  const bundleRow = db
    .prepare("SELECT session_id FROM research_bundles WHERE session_id = ?")
    .get(bundleSessionId);
  if (!bundleRow) {
    return NextResponse.json(
      { error: "Research bundle not found" },
      { status: 404 }
    );
  }

  if (existingScheduleId) {
    const existing = getSchedule(existingScheduleId);
    if (!existing) {
      return NextResponse.json(
        { error: "Schedule not found" },
        { status: 404 }
      );
    }
    if (existing.status === "approved") {
      return NextResponse.json(
        { error: "Cannot extend an already-approved schedule" },
        { status: 409 }
      );
    }

    const input: ContentScheduleInput = {
      scheduleId: existingScheduleId,
      bundleSessionId,
    };
    const jobId = enqueue("content-schedule", input);
    db.prepare(
      `UPDATE content_schedules SET job_id = ?, updated_at = datetime('now') WHERE id = ?`
    ).run(jobId, existingScheduleId);

    return NextResponse.json(
      { scheduleId: existingScheduleId, jobId },
      { status: 201 }
    );
  }

  const scheduleId = randomUUID();
  const input: ContentScheduleInput = { scheduleId, bundleSessionId };
  const jobId = enqueue("content-schedule", input);
  createSchedule(scheduleId, bundleSessionId, jobId);

  return NextResponse.json({ scheduleId, jobId }, { status: 201 });
}
