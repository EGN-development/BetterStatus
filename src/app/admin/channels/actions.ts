"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ChannelType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { dispatchToChannel } from "@/lib/notifications";
import { getSettings, publicUrl } from "@/lib/settings";

function buildConfig(type: ChannelType, formData: FormData): Prisma.InputJsonValue {
  const get = (k: string) => String(formData.get(k) ?? "").trim();
  switch (type) {
    case "TELEGRAM":
      return { botToken: get("botToken"), chatId: get("chatId") };
    case "EMAIL":
      return { to: get("to") };
    case "SLACK":
    case "DISCORD":
      return { webhookUrl: get("webhookUrl"), username: get("username"), avatarUrl: get("avatarUrl") };
    case "WEBHOOK":
    case "API": {
      let headers: Record<string, string> | undefined;
      const raw = get("headers");
      if (raw) {
        try {
          headers = JSON.parse(raw);
        } catch {}
      }
      return { url: get("url"), method: get("method") || "POST", headers: headers ?? {} };
    }
    default:
      return {};
  }
}

export async function createChannel(formData: FormData) {
  if (!(await getCurrentUser())) return;
  const type = String(formData.get("type") || "TELEGRAM") as ChannelType;
  await prisma.notificationChannel.create({
    data: {
      name: String(formData.get("name") || "Channel").trim(),
      type,
      enabled: formData.get("enabled") !== "off",
      config: buildConfig(type, formData),
    },
  });
  revalidatePath("/admin/channels");
  redirect("/admin/channels");
}

export async function updateChannel(id: string, formData: FormData) {
  if (!(await getCurrentUser())) return;
  const type = String(formData.get("type") || "TELEGRAM") as ChannelType;
  await prisma.notificationChannel.update({
    where: { id },
    data: {
      name: String(formData.get("name") || "Channel").trim(),
      type,
      enabled: formData.get("enabled") !== "off",
      config: buildConfig(type, formData),
    },
  });
  revalidatePath("/admin/channels");
  redirect("/admin/channels");
}

export async function deleteChannel(id: string) {
  if (!(await getCurrentUser())) return;
  await prisma.notificationChannel.delete({ where: { id } });
  revalidatePath("/admin/channels");
}

export async function testChannel(id: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await getCurrentUser())) return { ok: false, error: "unauthorized" };
  const [channel, settings] = await Promise.all([
    prisma.notificationChannel.findUnique({ where: { id } }),
    getSettings(),
  ]);
  if (!channel) return { ok: false, error: "not found" };
  return dispatchToChannel(
    channel,
    {
      title: `Test alert from ${settings.siteName}`,
      body: "This is a test notification. If you can read this, the channel works! 🎉",
      good: true,
      url: publicUrl(settings),
    },
    settings
  );
}
