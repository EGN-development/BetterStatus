import type { Monitor, MonitorStatus } from "@prisma/client";
import { prisma } from "../db";
import { getSettings, publicUrl } from "../settings";
import {
  AlertMessage,
  dispatchToChannel,
  dispatchToUrl,
} from "../notifications";
import { notifySubscribers } from "../subscribers";
import type { CheckResult } from "./types";

/**
 * Apply a check result to a monitor: persist the check, handle UP/DOWN
 * transitions (respecting retries), open/resolve auto incidents and fire alerts.
 */
export async function applyResult(monitor: Monitor, result: CheckResult): Promise<void> {
  const now = new Date();
  const consecutiveFails = result.up ? 0 : monitor.consecutiveFails + 1;

  let nextStatus: MonitorStatus = monitor.status;
  let transition: "up" | "down" | null = null;

  if (result.up) {
    if (monitor.status !== "UP") {
      nextStatus = "UP";
      if (monitor.status === "DOWN") transition = "up";
    }
  } else if (consecutiveFails >= monitor.retries) {
    if (monitor.status !== "DOWN") {
      nextStatus = "DOWN";
      transition = "down";
    }
  }

  await prisma.$transaction([
    prisma.monitorCheck.create({
      data: {
        monitorId: monitor.id,
        status: nextStatus,
        up: result.up,
        responseTimeMs: result.responseTimeMs ?? null,
        statusCode: result.statusCode ?? null,
        message: result.message,
      },
    }),
    prisma.monitor.update({
      where: { id: monitor.id },
      data: {
        status: nextStatus,
        consecutiveFails,
        lastCheckedAt: now,
        lastResponseTimeMs: result.responseTimeMs ?? null,
        lastMessage: result.message,
        ...(transition ? { lastStatusChangeAt: now } : {}),
      },
    }),
  ]);

  if (transition === "down") await onDown(monitor, result);
  if (transition === "up") await onUp(monitor, result);
}

async function onDown(monitor: Monitor, result: CheckResult): Promise<void> {
  const settings = await getSettings();
  const base = publicUrl(settings);

  // open an auto incident if none currently open for this monitor
  const existing = await prisma.incident.findFirst({
    where: { monitorId: monitor.id, auto: true, status: { not: "RESOLVED" } },
  });
  if (!existing) {
    await prisma.incident.create({
      data: {
        title: `${monitor.name} is down`,
        status: "INVESTIGATING",
        impact: "MAJOR",
        auto: true,
        monitorId: monitor.id,
        updates: {
          create: {
            status: "INVESTIGATING",
            body: `Automated monitoring detected an outage: ${result.message}`,
          },
        },
      },
    });
  }

  const msg: AlertMessage = {
    title: `🔴 ${monitor.name} is DOWN`,
    body: result.message,
    good: false,
    url: base,
  };
  await dispatchAlerts(monitor, msg);
}

async function onUp(monitor: Monitor, result: CheckResult): Promise<void> {
  const settings = await getSettings();
  const base = publicUrl(settings);

  // resolve any open auto incident
  const open = await prisma.incident.findMany({
    where: { monitorId: monitor.id, auto: true, status: { not: "RESOLVED" } },
  });
  for (const inc of open) {
    await prisma.incident.update({
      where: { id: inc.id },
      data: {
        status: "RESOLVED",
        resolvedAt: new Date(),
        updates: { create: { status: "RESOLVED", body: `Service recovered: ${result.message}` } },
      },
    });
  }

  const msg: AlertMessage = {
    title: `✅ ${monitor.name} recovered`,
    body: result.message,
    good: true,
    url: base,
  };
  await dispatchAlerts(monitor, msg);
}

async function dispatchAlerts(monitor: Monitor, msg: AlertMessage): Promise<void> {
  const [full, settings] = await Promise.all([
    prisma.monitor.findUnique({ where: { id: monitor.id }, include: { channels: true } }),
    getSettings(),
  ]);
  const tasks: Promise<unknown>[] = [];
  for (const ch of full?.channels ?? []) {
    tasks.push(dispatchToChannel(ch, msg, settings));
  }
  if (monitor.alertWebhookUrl) tasks.push(dispatchToUrl(monitor.alertWebhookUrl, msg));
  if (monitor.notifySubscribers) tasks.push(notifySubscribers(msg));
  await Promise.allSettled(tasks);
}
