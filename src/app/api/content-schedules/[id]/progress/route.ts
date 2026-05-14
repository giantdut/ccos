import { NextRequest, NextResponse } from "next/server";
import { getSchedule, getTasksForSchedule } from "@/lib/schedule-store";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const schedule = getSchedule(id);
  if (!schedule) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const tasks = getTasksForSchedule(id);
  const today = new Date().toISOString().slice(0, 10);

  const counts = { pending: 0, drafting: 0, inReview: 0, approved: 0, overdue: 0 };

  const taskRows = tasks.map((task) => {
    const overdue = task.publishDate < today && task.status !== "approved";
    if (overdue) counts.overdue++;
    if (task.status === "pending") counts.pending++;
    else if (task.status === "drafting") counts.drafting++;
    else if (task.status === "in-review") counts.inReview++;
    else if (task.status === "approved") counts.approved++;

    return {
      id: task.id,
      title: task.title,
      publishDate: task.publishDate,
      status: task.status,
      overdue,
    };
  });

  return NextResponse.json({ scheduleId: id, tasks: taskRows, counts });
}
