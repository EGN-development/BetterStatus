import { prisma } from "../db";
import { runCheck } from "./checks";
import { applyResult } from "./evaluate";
import { getSettings, publicUrl } from "../settings";
import { AlertMessage, dispatchToUrl } from "../notifications";
import { notifySubscribers } from "../subscribers";

let running = false;

/** One scheduler pass: run all due checks + evaluate heartbeats and agents. */
export async function tick(): Promise<{ checked: number }> {
  const now = Date.now();
  const monitors = await prisma.monitor.findMany({
    where: { active: true, status: { notIn: ["PAUSED", "MAINTENANCE"] } },
  });

  const due = monitors.filter((m) => {
    if (m.type === "CRON") return true; // heartbeat evaluated every tick
    if (!m.lastCheckedAt) return true;
    return now - m.lastCheckedAt.getTime() >= m.intervalSeconds * 1000;
  });

  let checked = 0;
  await Promise.allSettled(
    due.map(async (m) => {
      if (m.type === "CRON") {
        await evaluateHeartbeat(m, now);
        return;
      }
      checked++;
      const result = await runCheck(m);
      await applyResult(m, result);
    })
  );

  await evaluateAgents(now);
  await evaluateMaintenance(now);
  return { checked };
}

/** Move maintenance windows through their lifecycle and pause/resume monitors. */
async function evaluateMaintenance(now: number): Promise<void> {
  const list = await prisma.maintenance.findMany({
    where: { status: { not: "COMPLETED" } },
    include: { monitors: { select: { id: true } } },
  });
  for (const mw of list) {
    const start = mw.scheduledStart.getTime();
    const end = mw.scheduledEnd.getTime();
    const ids = mw.monitors.map((m) => m.id);

    if (now >= end) {
      await prisma.maintenance.update({ where: { id: mw.id }, data: { status: "COMPLETED" } });
      if (ids.length) {
        await prisma.monitor.updateMany({ where: { id: { in: ids }, status: "MAINTENANCE" }, data: { status: "PENDING" } });
      }
    } else if (mw.status === "SCHEDULED" && now >= start) {
      await prisma.maintenance.update({ where: { id: mw.id }, data: { status: "IN_PROGRESS" } });
      if (ids.length) {
        await prisma.monitor.updateMany({ where: { id: { in: ids } }, data: { status: "MAINTENANCE" } });
      }
      if (mw.notifySubscribers) {
        const s = await getSettings();
        await notifySubscribers({
          title: `🔧 ${mw.title}`,
          body: mw.body || "Scheduled maintenance has started.",
          good: true,
          url: publicUrl(s),
        });
      }
    }
  }
}

/** CRON / dead-man switch: down if no ping within interval + grace. */
async function evaluateHeartbeat(
  m: Awaited<ReturnType<typeof prisma.monitor.findMany>>[number],
  now: number
): Promise<void> {
  if (!m.lastCheckedAt) return; // still waiting for the first heartbeat
  const overdueMs = (m.intervalSeconds + m.graceSeconds) * 1000;
  const overdue = now - m.lastCheckedAt.getTime() > overdueMs;
  if (overdue && m.status !== "DOWN") {
    await applyResult(m, { up: false, message: "Missed expected heartbeat" });
  }
}

async function evaluateAgents(now: number): Promise<void> {
  const agents = await prisma.agent.findMany({ where: { active: true } });
  for (const a of agents) {
    const seen = a.lastSeenAt?.getTime() ?? 0;
    const isOnline = seen > 0 && now - seen <= a.offlineSeconds * 1000;
    if (isOnline === a.online) continue;

    await prisma.agent.update({ where: { id: a.id }, data: { online: isOnline } });

    const settings = await getSettings();
    const base = publicUrl(settings);
    const msg: AlertMessage = isOnline
      ? { title: `✅ ${a.name} back online`, body: `Agent on ${a.hostname ?? a.name} is reporting again.`, good: true, url: base }
      : { title: `🔴 ${a.name} offline`, body: `No metrics received from ${a.hostname ?? a.name}.`, good: false, url: base };

    const tasks: Promise<unknown>[] = [];
    if (a.alertWebhookUrl) tasks.push(dispatchToUrl(a.alertWebhookUrl, msg));
    if (a.notifySubscribers) tasks.push(notifySubscribers(msg));
    await Promise.allSettled(tasks);
  }
}

/** Start the in-process scheduler loop (idempotent). */
export function startScheduler(intervalMs = 15000): void {
  if (running) return;
  running = true;
  const loop = async () => {
    try {
      await tick();
    } catch (e) {
      console.error("[scheduler] tick error", e);
    }
  };
  // initial run shortly after boot, then on interval
  setTimeout(loop, 3000);
  setInterval(loop, intervalMs);
  console.log(`[scheduler] started (every ${intervalMs}ms)`);
}
