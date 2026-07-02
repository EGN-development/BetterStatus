"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma, MonitorType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { randomToken } from "@/lib/utils";
import { runCheck } from "@/lib/monitors/checks";
import { applyResult } from "@/lib/monitors/evaluate";

function num(v: FormDataEntryValue | null, def: number): number {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

function buildData(formData: FormData): Prisma.MonitorUncheckedCreateInput {
  const type = String(formData.get("type") || "HTTP") as MonitorType;

  let headers: Prisma.InputJsonValue | undefined;
  const rawHeaders = str(formData.get("requestHeaders"));
  if (rawHeaders) {
    try {
      headers = JSON.parse(rawHeaders);
    } catch {
      headers = undefined;
    }
  }

  const data: Prisma.MonitorUncheckedCreateInput = {
    name: String(formData.get("name") || "Untitled").trim(),
    type,
    group: str(formData.get("group")),
    intervalSeconds: num(formData.get("intervalSeconds"), 60),
    timeoutSeconds: num(formData.get("timeoutSeconds"), 30),
    retries: num(formData.get("retries"), 1),
    notifySubscribers: formData.get("notifySubscribers") === "on",
    alertWebhookUrl: str(formData.get("alertWebhookUrl")),
  };

  if (type === "HTTP" || type === "API") {
    data.url = str(formData.get("url"));
    data.method = String(formData.get("method") || "GET");
    data.expectedStatus = str(formData.get("expectedStatus")) || "200-299";
    data.keyword = str(formData.get("keyword"));
    data.keywordInverted = formData.get("keywordInverted") === "on";
    data.requestBody = str(formData.get("requestBody"));
    data.followRedirects = formData.get("followRedirects") !== "off";
    data.ignoreTls = formData.get("ignoreTls") === "on";
    if (headers !== undefined) data.requestHeaders = headers;
  } else if (type === "PING") {
    data.host = str(formData.get("host"));
  } else if (type === "TCP" || type === "UDP") {
    data.host = str(formData.get("host"));
    data.port = num(formData.get("port"), 80);
    if (type === "UDP") data.requestBody = str(formData.get("requestBody"));
    data.keyword = str(formData.get("keyword"));
  } else if (type === "DNS") {
    data.host = str(formData.get("host"));
    data.dnsRecordType = String(formData.get("dnsRecordType") || "A");
    data.dnsResolver = str(formData.get("dnsResolver"));
    data.dnsExpected = str(formData.get("dnsExpected"));
  } else if (type === "CRON") {
    data.graceSeconds = num(formData.get("graceSeconds"), 60);
  }

  return data;
}

export async function createMonitor(formData: FormData) {
  if (!(await getCurrentUser())) return;
  const data = buildData(formData);
  if (data.type === "CRON") data.heartbeatToken = randomToken(16);

  const channelIds = formData.getAll("channels").map(String);
  const monitor = await prisma.monitor.create({
    data: {
      ...data,
      channels: channelIds.length ? { connect: channelIds.map((id) => ({ id })) } : undefined,
    },
  });
  revalidatePath("/admin/monitors");
  redirect(`/admin/monitors/${monitor.id}`);
}

export async function updateMonitor(id: string, formData: FormData) {
  if (!(await getCurrentUser())) return;
  const data = buildData(formData);
  const channelIds = formData.getAll("channels").map(String);
  await prisma.monitor.update({
    where: { id },
    data: { ...data, channels: { set: channelIds.map((cid) => ({ id: cid })) } },
  });
  revalidatePath("/admin/monitors");
  revalidatePath(`/admin/monitors/${id}`);
  redirect(`/admin/monitors/${id}`);
}

export async function toggleMonitor(id: string) {
  if (!(await getCurrentUser())) return;
  const m = await prisma.monitor.findUnique({ where: { id } });
  if (!m) return;
  const paused = m.status === "PAUSED";
  await prisma.monitor.update({
    where: { id },
    data: { active: paused, status: paused ? "PENDING" : "PAUSED" },
  });
  revalidatePath("/admin/monitors");
  revalidatePath(`/admin/monitors/${id}`);
}

export async function deleteMonitor(id: string) {
  if (!(await getCurrentUser())) return;
  await prisma.monitor.delete({ where: { id } });
  revalidatePath("/admin/monitors");
  redirect("/admin/monitors");
}

export async function runMonitorNow(id: string) {
  if (!(await getCurrentUser())) return;
  const m = await prisma.monitor.findUnique({ where: { id } });
  if (!m || m.type === "CRON") return;
  const result = await runCheck(m);
  await applyResult(m, result);
  revalidatePath(`/admin/monitors/${id}`);
  revalidatePath("/admin/monitors");
}
