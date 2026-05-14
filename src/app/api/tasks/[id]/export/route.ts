import { NextRequest, NextResponse } from "next/server";
import { getDraftByTaskId } from "@/lib/draft-store";
import { getTask } from "@/lib/schedule-store";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = getTask(id);
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const draft = getDraftByTaskId(id);
  if (!draft || draft.status !== "approved" || !draft.draftContent) {
    return NextResponse.json(
      { error: "No approved content available for export" },
      { status: 409 }
    );
  }

  const filename = `${task.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.md`;
  return new NextResponse(draft.draftContent, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
