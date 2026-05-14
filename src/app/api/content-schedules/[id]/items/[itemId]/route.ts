import { NextRequest, NextResponse } from "next/server";
import { getSchedule, deleteScheduleItem } from "@/lib/schedule-store";
import { record } from "@/lib/signal-store";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;

  const schedule = getSchedule(id);
  if (!schedule) {
    return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
  }
  if (schedule.status !== "proposed") {
    return NextResponse.json(
      { error: "Schedule is not in proposed state" },
      { status: 409 }
    );
  }

  const deleted = deleteScheduleItem(id, itemId);
  if (!deleted) {
    return NextResponse.json(
      { error: "Schedule item not found" },
      { status: 404 }
    );
  }

  record("schedule_item_rejected", { scheduleId: id, itemId });

  return NextResponse.json({ ok: true });
}
