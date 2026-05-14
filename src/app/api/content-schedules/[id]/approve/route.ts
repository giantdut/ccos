import { NextRequest, NextResponse } from "next/server";
import { approveSchedule } from "@/lib/schedule-store";
import { createDraft } from "@/lib/draft-store";
import { enqueue } from "@/lib/job-runner";
import "@/lib/jobs/drafting-pipeline";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const tasks = approveSchedule(id);

    const taskJobs: { taskId: string; jobId: string }[] = [];
    for (const task of tasks) {
      const jobId = enqueue("drafting-pipeline", { taskId: task.id });
      createDraft(task.id, jobId);
      taskJobs.push({ taskId: task.id, jobId });
    }

    return NextResponse.json({ tasks, taskJobs });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    if (message.includes("already approved")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
