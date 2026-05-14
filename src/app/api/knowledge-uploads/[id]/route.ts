import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import db from "@/lib/db";

function getUploadsDir(): string {
  return process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.join(process.cwd(), "uploads");
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  type Row = { id: string; filename: string };
  const row = db
    .prepare("SELECT id, filename FROM knowledge_uploads WHERE id = ?")
    .get(id) as Row | undefined;

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  db.prepare("DELETE FROM knowledge_uploads WHERE id = ?").run(id);

  const uploadsDir = getUploadsDir();
  const filePath = path.join(uploadsDir, `${id}-${row.filename}`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  return new NextResponse(null, { status: 204 });
}
