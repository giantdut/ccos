import { NextRequest, NextResponse } from "next/server";
import { editDraft, getDraftByTaskId } from "@/lib/draft-store";
import { getTask } from "@/lib/schedule-store";
import { record } from "@/lib/signal-store";

export const runtime = "nodejs";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = getTask(id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json() as { content?: string };
  if (typeof body.content !== "string") {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  try {
    editDraft(id, body.content);
    const draft = getDraftByTaskId(id);
    record("draft_edit", { taskId: id, editDistance: draft?.editDistance ?? 0 });
    return NextResponse.json({ draft });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
