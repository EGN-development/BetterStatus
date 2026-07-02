import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUptimeBuckets, type UptimeRange } from "@/lib/monitors/stats";

export const dynamic = "force-dynamic";

const RANGES: UptimeRange[] = ["24h", "7d", "30d", "90d"];

// GET /api/public/uptime?range=90d  — public uptime buckets for all active monitors.
export async function GET(req: NextRequest) {
  const r = req.nextUrl.searchParams.get("range") as UptimeRange | null;
  const range: UptimeRange = r && RANGES.includes(r) ? r : "90d";

  const monitors = await prisma.monitor.findMany({
    where: { active: true },
    select: { id: true },
    orderBy: [{ group: "asc" }, { createdAt: "asc" }],
  });

  const data = await Promise.all(
    monitors.map(async (m) => ({ id: m.id, ...(await getUptimeBuckets(m.id, range)) }))
  );

  return NextResponse.json({ range, monitors: data });
}
