import crypto from "node:crypto";
import type { Settings } from "@prisma/client";
import { prisma } from "./db";
import { getSettings, updateSettings, publicUrl } from "./settings";

const api = (token: string, method: string) => `https://api.telegram.org/bot${token}/${method}`;

export async function tgCall(token: string, method: string, body: unknown): Promise<{ ok: boolean; result?: Record<string, unknown> }> {
  try {
    const res = await fetch(api(token, method), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as { ok: boolean; result?: Record<string, unknown> };
  } catch {
    return { ok: false };
  }
}

/** Stable per-token secret used to authenticate webhook calls. */
export function webhookSecret(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token + (process.env.APP_SECRET || "bs"))
    .digest("hex")
    .slice(0, 24);
}

export async function setupTelegramWebhook(settings: Settings): Promise<void> {
  const token = settings.telegramBotToken;
  if (!token) return;
  const base = publicUrl(settings);
  const secret = webhookSecret(token);
  await tgCall(token, "setWebhook", {
    url: `${base}/api/telegram/webhook?secret=${secret}`,
    allowed_updates: ["message", "callback_query"],
  });
  if (!settings.telegramBotUsername) {
    const me = await tgCall(token, "getMe", {});
    const username = me.result?.username as string | undefined;
    if (username) await updateSettings({ telegramBotUsername: username });
  }
}

export async function sendTelegram(
  token: string,
  chatId: string,
  text: string,
  replyMarkup?: unknown
): Promise<boolean> {
  const r = await tgCall(token, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
  return r.ok;
}

const langKeyboard = {
  inline_keyboard: [[
    { text: "🇬🇧 English", callback_data: "lang:en" },
    { text: "🇷🇺 Русский", callback_data: "lang:ru" },
  ]],
};

interface TgUpdate {
  message?: { text?: string; chat: { id: number; first_name?: string } };
  callback_query?: { id: string; data?: string; message?: { chat: { id: number } } };
}

/** Process a Telegram webhook update (start binding + language choice). */
export async function handleTelegramUpdate(update: TgUpdate): Promise<void> {
  const settings = await getSettings();
  const token = settings.telegramBotToken;
  if (!token) return;

  // /start <bindToken>
  const text = update.message?.text;
  if (text && text.startsWith("/start")) {
    const chatId = String(update.message!.chat.id);
    const bindToken = text.split(/\s+/)[1];
    const name = settings.siteName;

    if (bindToken) {
      const pending = await prisma.subscriber.findUnique({ where: { token: bindToken } });
      if (pending && pending.channel === "TELEGRAM" && pending.target.startsWith("pending:")) {
        const existing = await prisma.subscriber.findUnique({
          where: { channel_target: { channel: "TELEGRAM", target: chatId } },
        });
        if (existing) {
          await prisma.subscriber.delete({ where: { id: pending.id } }).catch(() => {});
        } else {
          await prisma.subscriber.update({ where: { id: pending.id }, data: { target: chatId, verified: true } });
        }
        await sendTelegram(
          token,
          chatId,
          `✅ <b>${name}</b>\nYou are now subscribed to status updates.\n\nChoose your notification language / Выберите язык уведомлений:`,
          langKeyboard
        );
        return;
      }
    }
    await sendTelegram(token, chatId, `👋 <b>${name}</b>\nUse the “Subscribe” button on the status page to link your account.`);
    return;
  }

  // language selection
  const cb = update.callback_query;
  if (cb?.data?.startsWith("lang:") && cb.message) {
    const chatId = String(cb.message.chat.id);
    const lang = cb.data.slice(5) === "ru" ? "ru" : "en";
    await prisma.subscriber.updateMany({ where: { channel: "TELEGRAM", target: chatId }, data: { lang } });
    await tgCall(token, "answerCallbackQuery", { callback_query_id: cb.id });
    await sendTelegram(token, chatId, lang === "ru" ? "Язык уведомлений: <b>Русский</b> ✅" : "Notification language: <b>English</b> ✅");
  }
}
