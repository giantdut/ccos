import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import type { ResearchBundle } from "@/lib/researcher-agent";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const row = db
    .prepare("SELECT content FROM research_bundles WHERE session_id = ?")
    .get(id) as { content: string } | undefined;

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bundle = JSON.parse(row.content) as ResearchBundle;
  return NextResponse.json(bundle);
}
