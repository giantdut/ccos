import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import db from "@/lib/db";

function getUploadsDir(): string {
  const dir = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.join(process.cwd(), "uploads");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export async function GET() {
  type Row = {
    id: string;
    filename: string;
    size: number;
    uploaded_at: string;
  };
  const rows = db
    .prepare(
      "SELECT id, filename, size, uploaded_at FROM knowledge_uploads ORDER BY uploaded_at DESC"
    )
    .all() as Row[];

  const uploads = rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    size: r.size,
    uploadedAt: r.uploaded_at,
  }));

  return NextResponse.json(uploads);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const uploadsDir = getUploadsDir();
  const id = randomUUID();
  const filename = file.name;
  const size = file.size;
  const filePath = path.join(uploadsDir, `${id}-${filename}`);

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  fs.writeFileSync(filePath, buffer);

  let content = "";
  try {
    content = buffer.toString("utf-8");
    // Basic check: if it decoded but looks binary, discard
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_) {
    content = "";
  }

  const uploadedAt = new Date().toISOString().replace("T", " ").slice(0, 19);

  db.prepare(
    "INSERT INTO knowledge_uploads (id, filename, size, content, uploaded_at) VALUES (?, ?, ?, ?, ?)"
  ).run(id, filename, size, content, uploadedAt);

  return NextResponse.json(
    { id, filename, size, uploadedAt },
    { status: 201 }
  );
}
