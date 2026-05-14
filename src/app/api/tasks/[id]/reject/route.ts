import { NextRequest, NextResponse } from "next/server";
import { getDraftByTaskId } from "@/lib/draft-store";
import { getTask } from "@/lib/schedule-store";
import { record } from "@/lib/signal-store";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = getTask(id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const draft = getDraftByTaskId(id);
  if (!draft || draft.status !== "ready") {
    return NextResponse.json(
      { error: "Draft is not ready" },
      { status: 409 }
    );
  }

  record("draft_rejected", { taskId: id });
  return NextResponse.json({ ok: true });
}
