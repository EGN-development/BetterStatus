import { NextRequest, NextResponse } from "next/server";
import { tick } from "@/lib/monitors/scheduler";

export const dynamic = "force-dynamic";

// POST /api/internal/tick  — run one scheduler pass.
// Useful for external cron / serverless. Protect with APP_SECRET if set.
export async function POST(req: NextRequest) {
  const secret = process.env.APP_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const key = req.nextUrl.searchParams.get("key");
    if (auth !== `Bearer ${secret}` && key !== secret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  }
  const result = await tick();
  return NextResponse.json({ ok: true, ...result });
}
