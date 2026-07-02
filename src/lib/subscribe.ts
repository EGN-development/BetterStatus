"use server";

import crypto from "node:crypto";
import type { SubscriberChannel } from "@prisma/client";
import { prisma } from "./db";
import { getSettings, publicUrl } from "./settings";
import { sendEmail, renderEmail, sendDiscord, sendSlack, sendWebhook } from "./notifications";

/** Create a one-time Telegram binding deep-link for the subscriber bot. */
export async function createTelegramBindLink(): Promise<{ url?: string; error?: string }> {
  const settings = await getSettings();
  if (!settings.allowSubscribers) return { error: "Subscriptions are disabled." };
  if (!settings.telegramBotToken || !settings.telegramBotUsername) {
    return { error: "Telegram is not configured." };
  }
  const token = crypto.randomBytes(18).toString("hex");
  await prisma.subscriber.create({
    data: { channel: "TELEGRAM", target: `pending:${token}`, verified: false, token },
  });
  return { url: `https://t.me/${settings.telegramBotUsername}?start=${token}` };
}

export async function subscribe(
  _prev: unknown,
  formData: FormData
): Promise<{ ok?: boolean; error?: string; message?: string }> {
  const settings = await getSettings();
  if (!settings.allowSubscribers) return { error: "Subscriptions are disabled." };

  const channel = String(formData.get("channel") || "EMAIL") as SubscriberChannel;
  const target = String(formData.get("target") || "").trim();
  if (!target) return { error: "Please provide a destination." };
  if (channel === "EMAIL" && !target.includes("@")) return { error: "Enter a valid email." };
  if (channel === "DISCORD" && !/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+/.test(target)) {
    return { error: "Enter a valid Discord webhook URL." };
  }
  if ((channel === "SLACK" || channel === "WEBHOOK") && !/^https?:\/\/.+/.test(target)) {
    return { error: "Enter a valid webhook URL." };
  }

  // non-email subscribers own their endpoint, so auto-verify them
  const verified = channel !== "EMAIL";

  const sub = await prisma.subscriber.upsert({
    where: { channel_target: { channel, target } },
    update: {},
    create: { channel, target, verified },
  });

  if (channel === "EMAIL" && !sub.verified) {
    const base = publicUrl(settings);
    const link = `${base}/verify?token=${sub.token}`;
    await sendEmail(
      target,
      `Confirm your subscription to ${settings.siteName}`,
      renderEmail({
        siteName: settings.siteName,
        title: "Confirm your subscription",
        body: `Confirm you want to receive status updates from ${settings.siteName}.\nIf you didn't request this, just ignore this email.`,
        good: true,
        url: link,
      }),
      settings
    );
    return { ok: true, message: "Check your email to confirm your subscription." };
  }

  // Webhook-based subscribers: send a confirmation to validate the endpoint.
  if (channel === "DISCORD" || channel === "SLACK" || channel === "WEBHOOK") {
    const base = publicUrl(settings);
    const welcome = {
      title: `Subscribed to ${settings.siteName}`,
      body: "You'll receive status updates here. 🎉",
      good: true,
      url: base,
      siteName: settings.siteName,
      unsubscribeUrl: `${base}/unsubscribe?token=${sub.token}`,
    };
    const res =
      channel === "DISCORD"
        ? await sendDiscord({ webhookUrl: target }, welcome)
        : channel === "SLACK"
          ? await sendSlack({ webhookUrl: target }, welcome)
          : await sendWebhook({ url: target }, welcome);
    if (!res.ok) {
      await prisma.subscriber.delete({ where: { id: sub.id } }).catch(() => {});
      return { error: `Could not reach that webhook${res.error ? `: ${res.error}` : ""}.` };
    }
  }

  return { ok: true, message: "You're subscribed to status updates." };
}
