import { NextRequest, NextResponse } from "next/server";
import { approveDraft, getDraftByTaskId } from "@/lib/draft-store";
import { getTask } from "@/lib/schedule-store";

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
      { error: "Draft is not ready for approval" },
      { status: 409 }
    );
  }

  approveDraft(id);
  return NextResponse.json({ ok: true });
}
