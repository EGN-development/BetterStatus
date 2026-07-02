import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { webhookSecret, handleTelegramUpdate } from "@/lib/telegram";

export const dynamic = "force-dynamic";

// POST /api/telegram/webhook?secret=...  — Telegram bot updates.
export async function POST(req: NextRequest) {
  const settings = await getSettings();
  const token = settings.telegramBotToken;
  if (!token) return NextResponse.json({ ok: false }, { status: 404 });
  if (req.nextUrl.searchParams.get("secret") !== webhookSecret(token)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  try {
    const update = await req.json();
    await handleTelegramUpdate(update);
  } catch {
    // swallow — always 200 so Telegram doesn't retry storm
  }
  return NextResponse.json({ ok: true });
}
