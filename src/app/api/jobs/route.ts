import { NextRequest, NextResponse } from "next/server";
import { enqueue } from "@/lib/job-runner";
// Ensure job handlers are registered
import "@/lib/jobs/hello-agent";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { type?: unknown; input?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.type || typeof body.type !== "string") {
    return NextResponse.json(
      { error: "Missing required field: type" },
      { status: 400 }
    );
  }

  const jobId = enqueue(body.type, body.input);
  return NextResponse.json({ jobId }, { status: 201 });
}
