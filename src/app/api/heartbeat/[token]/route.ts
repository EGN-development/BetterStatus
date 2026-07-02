import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyResult } from "@/lib/monitors/evaluate";

export const dynamic = "force-dynamic";

// GET/POST /api/heartbeat/<token>[?status=down&msg=...]
// Push endpoint for CRON / dead-man-switch monitors.
async function handle(req: NextRequest, token: string) {
  const monitor = await prisma.monitor.findUnique({ where: { heartbeatToken: token } });
  if (!monitor || monitor.type !== "CRON") {
    return NextResponse.json({ ok: false, error: "Unknown heartbeat token" }, { status: 404 });
  }
  const status = req.nextUrl.searchParams.get("status");
  const msg = req.nextUrl.searchParams.get("msg") || undefined;
  const up = status !== "down" && status !== "fail" && status !== "0";

  await applyResult(monitor, {
    up,
    message: msg || (up ? "Heartbeat received" : "Heartbeat reported failure"),
  });
  return NextResponse.json({ ok: true, monitor: monitor.name, up });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  return handle(req, token);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  return handle(req, token);
}
