import nodemailer from "nodemailer";
import type { NotificationChannel, Settings } from "@prisma/client";
import { getSettings, publicUrl } from "./settings";

export interface SendResult {
  ok: boolean;
  error?: string;
}

export interface AlertMessage {
  title: string;
  body: string;
  /** UP/recovery vs DOWN/incident — drives color/emoji. */
  good: boolean;
  url?: string;
  /** Optional branding shown in Slack/Discord footers. */
  siteName?: string;
}

// ───────────────────── low-level senders ─────────────────────

interface PostResult extends SendResult {
  status?: number;
  retryAfter?: number;
}

async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string> = {},
  method = "POST"
): Promise<PostResult> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let detail = "";
      try {
        detail = (await res.text()).slice(0, 300);
      } catch {}
      const retryAfter = Number(res.headers.get("retry-after")) || undefined;
      return { ok: false, status: res.status, retryAfter, error: `HTTP ${res.status}${detail ? `: ${detail}` : ""}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "request failed" };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function sendTelegram(cfg: { botToken?: string; chatId?: string }, msg: AlertMessage): Promise<SendResult> {
  if (!cfg.botToken || !cfg.chatId) return { ok: false, error: "missing botToken/chatId" };
  const emoji = msg.good ? "✅" : "🔴";
  const text = `${emoji} *${escapeMd(msg.title)}*\n${escapeMd(msg.body)}${msg.url ? `\n${msg.url}` : ""}`;
  return postJson(`https://api.telegram.org/bot${cfg.botToken}/sendMessage`, {
    chat_id: cfg.chatId,
    text,
    parse_mode: "Markdown",
    disable_web_page_preview: true,
  });
}

export async function sendSlack(
  cfg: { webhookUrl?: string; username?: string; avatarUrl?: string },
  msg: AlertMessage
): Promise<SendResult> {
  if (!cfg.webhookUrl) return { ok: false, error: "missing webhookUrl" };
  const r = await postJson(cfg.webhookUrl, {
    ...(cfg.username ? { username: cfg.username } : {}),
    ...(cfg.avatarUrl ? { icon_url: cfg.avatarUrl } : {}),
    attachments: [
      {
        color: msg.good ? "#22c55e" : "#ef4444",
        title: msg.title,
        text: msg.body + (msg.url ? `\n<${msg.url}|View status page>` : ""),
        footer: msg.siteName,
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  });
  return { ok: r.ok, error: r.error };
}

export async function sendDiscord(
  cfg: { webhookUrl?: string; username?: string; avatarUrl?: string },
  msg: AlertMessage
): Promise<SendResult> {
  if (!cfg.webhookUrl) return { ok: false, error: "missing webhookUrl" };
  if (!/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/[\w-]+/.test(cfg.webhookUrl)) {
    return { ok: false, error: "invalid Discord webhook URL (expected https://discord.com/api/webhooks/<id>/<token>)" };
  }
  const payload = {
    ...(cfg.username ? { username: cfg.username.slice(0, 80) } : {}),
    ...(cfg.avatarUrl ? { avatar_url: cfg.avatarUrl } : {}),
    embeds: [
      {
        title: msg.title.slice(0, 256),
        description: (msg.body + (msg.url ? `\n\n[View status page →](${msg.url})` : "")).slice(0, 4000),
        color: msg.good ? 0x22c55e : 0xef4444,
        timestamp: new Date().toISOString(),
        ...(msg.siteName ? { footer: { text: msg.siteName.slice(0, 2048) } } : {}),
      },
    ],
  };
  let r = await postJson(cfg.webhookUrl, payload);
  if (!r.ok && r.status === 429) {
    await sleep(Math.min(5000, Math.max(500, (r.retryAfter || 1) * 1000)));
    r = await postJson(cfg.webhookUrl, payload);
  }
  return { ok: r.ok, error: r.error };
}

export async function sendWebhook(
  cfg: { url?: string; method?: string; headers?: Record<string, string> },
  payload: unknown
): Promise<SendResult> {
  if (!cfg.url) return { ok: false, error: "missing url" };
  return postJson(cfg.url, payload, cfg.headers ?? {}, cfg.method ?? "POST");
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  settings?: Settings
): Promise<SendResult> {
  const s = settings ?? (await getSettings());
  if (!s.smtpHost) return { ok: false, error: "SMTP not configured" };
  try {
    const transport = nodemailer.createTransport({
      host: s.smtpHost,
      port: s.smtpPort ?? 587,
      secure: s.smtpSecure,
      auth: s.smtpUser ? { user: s.smtpUser, pass: s.smtpPass ?? "" } : undefined,
    });
    await transport.sendMail({
      from: s.smtpFrom || s.smtpUser || "status@localhost",
      to,
      subject,
      html,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "smtp error" };
  }
}

// ───────────────────── channel dispatch ─────────────────────

function escapeMd(s: string): string {
  return s.replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
}

/** Build a generic JSON payload used for webhook/api channels. */
export function webhookPayload(msg: AlertMessage, extra: Record<string, unknown> = {}) {
  return {
    title: msg.title,
    message: msg.body,
    status: msg.good ? "up" : "down",
    url: msg.url,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

export async function dispatchToChannel(
  channel: NotificationChannel,
  msg: AlertMessage,
  settings?: Settings
): Promise<SendResult> {
  if (!channel.enabled) return { ok: false, error: "disabled" };
  const cfg = (channel.config ?? {}) as Record<string, string>;
  const m: AlertMessage = { ...msg, siteName: msg.siteName ?? settings?.siteName };
  switch (channel.type) {
    case "TELEGRAM":
      return sendTelegram(cfg, m);
    case "SLACK":
      return sendSlack(cfg, m);
    case "DISCORD":
      return sendDiscord(cfg, m);
    case "WEBHOOK":
      return sendWebhook(cfg as never, webhookPayload(msg));
    case "API":
      return sendWebhook(cfg as never, webhookPayload(msg));
    case "EMAIL":
      return sendEmail(
        cfg.to,
        msg.title,
        renderEmail({ siteName: settings?.siteName ?? "Better Status", title: msg.title, body: msg.body, good: msg.good, url: msg.url }),
        settings
      );
    default:
      return { ok: false, error: "unknown channel type" };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

/** Branded, responsive notification email (inline styles for email clients). */
export function renderEmail(o: {
  siteName: string;
  title: string;
  body: string;
  good: boolean;
  url?: string;
  unsubscribeUrl?: string;
  lang?: "en" | "ru";
}): string {
  const accent = o.good ? "#16a34a" : "#dc2626";
  const t = (en: string, ru: string) => (o.lang === "ru" ? ru : en);
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#f4f5f7;padding:24px;margin:0">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="height:4px;background:${accent}"></div>
    <div style="padding:28px 28px 20px">
      <div style="display:inline-block;background:${accent}1a;color:${accent};font-size:12px;font-weight:600;padding:4px 10px;border-radius:999px;margin-bottom:14px">${escapeHtml(o.siteName)}</div>
      <h1 style="font-size:19px;margin:0 0 12px;color:#111827">${escapeHtml(o.title)}</h1>
      <p style="font-size:14px;color:#374151;line-height:1.65;margin:0 0 22px;white-space:pre-line">${escapeHtml(o.body)}</p>
      ${o.url ? `<a href="${o.url}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;padding:11px 20px;border-radius:9px;font-size:14px;font-weight:600">${t("View status page", "Открыть статус-страницу")} →</a>` : ""}
    </div>
    <div style="padding:16px 28px;border-top:1px solid #f0f1f3;font-size:12px;color:#9ca3af">
      ${o.unsubscribeUrl ? `<a href="${o.unsubscribeUrl}" style="color:#9ca3af">${t("Unsubscribe", "Отписаться")}</a> &middot; ` : ""}${t("Powered by Better Status", "Работает на Better Status")}
    </div>
  </div>
</div>`;
}

/** Send a raw alert message to an arbitrary webhook URL (per-monitor quick alert). */
export async function dispatchToUrl(url: string, msg: AlertMessage): Promise<SendResult> {
  return sendWebhook({ url }, webhookPayload(msg));
}

export function statusPageUrl(settings: Settings): string {
  return publicUrl(settings);
}
