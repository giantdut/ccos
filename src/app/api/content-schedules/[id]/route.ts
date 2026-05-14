import { NextRequest, NextResponse } from "next/server";
import { getSchedule, getScheduleItems, getTasksForSchedule } from "@/lib/schedule-store";

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

  const items = getScheduleItems(id);
  const tasks = getTasksForSchedule(id);

  return NextResponse.json({ ...schedule, items, tasks });
}
