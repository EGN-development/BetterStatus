"use server";

import { revalidatePath } from "next/cache";
import type { Settings } from "@prisma/client";
import { updateSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { isValidTheme } from "@/lib/themes";
import { setupTelegramWebhook } from "@/lib/telegram";

// Stored as a data: URL in the DB — robust across rebuilds / containers,
// no runtime filesystem or static-serving needed. Capped small (favicon/logo).
async function saveUpload(file: unknown): Promise<string | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > 512 * 1024) return null; // 512KB cap
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type && file.type.startsWith("image/") ? file.type : "image/png";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function colorOrNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return /^#[0-9a-fA-F]{3,8}$/.test(s) ? s : null;
}

export async function saveSettings(_prev: unknown, formData: FormData) {
  if (!(await getCurrentUser())) return { error: "Unauthorized" };

  const theme = String(formData.get("theme") || "midnight");
  const smtpPortRaw = String(formData.get("smtpPort") || "").trim();

  const logoUrl = await saveUpload(formData.get("logoFile"));
  const faviconUrl = await saveUpload(formData.get("faviconFile"));

  const data: Partial<Omit<Settings, "id" | "updatedAt">> = {
    siteName: String(formData.get("siteName") || "Better Status").trim() || "Better Status",
    siteDescription: String(formData.get("siteDescription") || "").trim(),
    theme: isValidTheme(theme) ? theme : "midnight",
    publicUrl: String(formData.get("publicUrl") || "").trim() || null,
    allowSubscribers: formData.get("allowSubscribers") === "on",
    // SMTP
    smtpHost: String(formData.get("smtpHost") || "").trim() || null,
    smtpPort: smtpPortRaw ? Number(smtpPortRaw) : 587,
    smtpUser: String(formData.get("smtpUser") || "").trim() || null,
    smtpPass: String(formData.get("smtpPass") || "").trim() || null,
    smtpFrom: String(formData.get("smtpFrom") || "").trim() || null,
    smtpSecure: formData.get("smtpSecure") === "on",
    // Telegram bot
    telegramBotToken: String(formData.get("telegramBotToken") || "").trim() || null,
    telegramBotUsername: String(formData.get("telegramBotUsername") || "").trim().replace(/^@/, "") || null,
    // global display toggles
    showClusterAverages: formData.get("showClusterAverages") === "on",
    showNodeMetrics: formData.get("showNodeMetrics") === "on",
    showCpuUsage: formData.get("showCpuUsage") === "on",
    showMemoryUsage: formData.get("showMemoryUsage") === "on",
    showDiskUsage: formData.get("showDiskUsage") === "on",
    showLoad: formData.get("showLoad") === "on",
    showDiskIo: formData.get("showDiskIo") === "on",
    showNetIo: formData.get("showNetIo") === "on",
    // custom colors
    useCustomColors: formData.get("useCustomColors") === "on",
    colBg: colorOrNull(formData.get("colBg")),
    colCard: colorOrNull(formData.get("colCard")),
    colBorder: colorOrNull(formData.get("colBorder")),
    colPrimary: colorOrNull(formData.get("colPrimary")),
    colForeground: colorOrNull(formData.get("colForeground")),
    colMuted: colorOrNull(formData.get("colMuted")),
    colMutedFg: colorOrNull(formData.get("colMutedFg")),
    colSuccess: colorOrNull(formData.get("colSuccess")),
    colWarning: colorOrNull(formData.get("colWarning")),
    colDanger: colorOrNull(formData.get("colDanger")),
  };
  if (formData.get("removeLogo") === "on") data.logoUrl = null;
  else if (logoUrl) data.logoUrl = logoUrl;
  if (formData.get("removeFavicon") === "on") data.faviconUrl = null;
  else if (faviconUrl) data.faviconUrl = faviconUrl;

  const saved = await updateSettings(data);

  // (re)register the Telegram webhook when a bot token is present
  await setupTelegramWebhook(saved).catch(() => {});

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}
