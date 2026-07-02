import { prisma } from "./db";
import {
  AlertMessage,
  sendEmail,
  sendSlack,
  sendDiscord,
  sendWebhook,
  sendTelegram,
  renderEmail,
} from "./notifications";
import { getSettings, publicUrl } from "./settings";

/** Notify all verified subscribers of the public status page. */
export async function notifySubscribers(msg: AlertMessage): Promise<void> {
  const [subs, settings] = await Promise.all([
    prisma.subscriber.findMany({ where: { verified: true } }),
    getSettings(),
  ]);
  if (subs.length === 0) return;

  // the subscriber bot token (fallback to a TELEGRAM alert channel / env)
  const tgChannel = await prisma.notificationChannel.findFirst({
    where: { type: "TELEGRAM", enabled: true },
  });
  const botToken =
    settings.telegramBotToken ||
    (tgChannel?.config as { botToken?: string } | null)?.botToken ||
    process.env.TELEGRAM_BOT_TOKEN;

  const branded = { ...msg, siteName: settings.siteName };

  await Promise.allSettled(
    subs.map((sub) => {
      switch (sub.channel) {
        case "EMAIL":
          return sendEmail(
            sub.target,
            msg.title,
            renderEmail({
              siteName: settings.siteName,
              title: msg.title,
              body: msg.body,
              good: msg.good,
              url: msg.url,
              unsubscribeUrl: `${publicUrl(settings)}/unsubscribe?token=${sub.token}`,
              lang: sub.lang === "ru" ? "ru" : "en",
            }),
            settings
          );
        case "SLACK":
          return sendSlack({ webhookUrl: sub.target }, branded);
        case "DISCORD":
          return sendDiscord({ webhookUrl: sub.target }, branded);
        case "WEBHOOK":
          return sendWebhook({ url: sub.target }, branded);
        case "TELEGRAM":
          return botToken
            ? sendTelegram({ botToken, chatId: sub.target }, branded)
            : Promise.resolve({ ok: false });
        default:
          return Promise.resolve({ ok: false });
      }
    })
  );
}
