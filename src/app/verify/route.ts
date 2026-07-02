import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (token) {
    await prisma.subscriber.updateMany({ where: { token }, data: { verified: true } }).catch(() => {});
  }
  return NextResponse.redirect(new URL("/?subscribed=1", req.url));
}
