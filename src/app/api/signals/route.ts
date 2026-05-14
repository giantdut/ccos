import { NextRequest, NextResponse } from "next/server";
import { listSignals, aggregateSignals } from "@/lib/signal-store";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sinceParam = searchParams.get("since");

  let since: string;
  if (sinceParam) {
    since = sinceParam;
  } else {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    since = d.toISOString().replace("T", " ").slice(0, 19);
  }

  const aggregates = aggregateSignals(since);
  const signals = listSignals(since);

  return NextResponse.json({ aggregates, signals });
}
