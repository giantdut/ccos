import { NextRequest, NextResponse } from "next/server";
import { getProfile, setProfile } from "@/lib/brand-profile-store";
import { record } from "@/lib/signal-store";

export const runtime = "nodejs";

export async function GET() {
  const profile = getProfile();
  return NextResponse.json(profile);
}

export async function PUT(request: NextRequest) {
  const body = await request.json() as Record<string, unknown>;
  setProfile(body as Parameters<typeof setProfile>[0]);
  record("brand_profile_override", { fields: Object.keys(body) });
  const updated = getProfile();
  return NextResponse.json(updated);
}
