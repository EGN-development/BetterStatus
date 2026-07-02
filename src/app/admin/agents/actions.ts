"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { randomToken } from "@/lib/utils";

function intOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function fields(formData: FormData) {
  return {
    name: String(formData.get("name") || "Server").trim(),
    cpuThreshold: intOrNull(formData.get("cpuThreshold")),
    memThreshold: intOrNull(formData.get("memThreshold")),
    diskThreshold: intOrNull(formData.get("diskThreshold")),
    offlineSeconds: intOrNull(formData.get("offlineSeconds")) ?? 120,
    alertWebhookUrl: String(formData.get("alertWebhookUrl") || "").trim() || null,
    notifySubscribers: formData.get("notifySubscribers") === "on",
    poolId: String(formData.get("poolId") || "").trim() || null,
    public: formData.get("public") === "on",
    showCpuModel: formData.get("showCpuModel") === "on",
    showCpuThreads: formData.get("showCpuThreads") === "on",
    showTotalMemory: formData.get("showTotalMemory") === "on",
    showCpuUsage: formData.get("showCpuUsage") === "on",
    showMemoryUsage: formData.get("showMemoryUsage") === "on",
    showDiskUsage: formData.get("showDiskUsage") === "on",
    showLoad: formData.get("showLoad") === "on",
    showDiskIo: formData.get("showDiskIo") === "on",
    showNetIo: formData.get("showNetIo") === "on",
    showUptime: formData.get("showUptime") === "on",
  };
}

export async function createPool(formData: FormData) {
  if (!(await getCurrentUser())) return;
  const name = String(formData.get("poolName") || "").trim();
  if (!name) return;
  await prisma.pool.create({
    data: { name, description: String(formData.get("poolDescription") || "").trim() || null },
  });
  revalidatePath("/admin/agents");
}

export async function deletePool(id: string) {
  if (!(await getCurrentUser())) return;
  await prisma.pool.delete({ where: { id } });
  revalidatePath("/admin/agents");
}

export async function createAgent(formData: FormData) {
  if (!(await getCurrentUser())) return;
  const agent = await prisma.agent.create({
    data: { ...fields(formData), token: randomToken(24) },
  });
  revalidatePath("/admin/agents");
  redirect(`/admin/agents/${agent.id}`);
}

export async function updateAgent(id: string, formData: FormData) {
  if (!(await getCurrentUser())) return;
  await prisma.agent.update({ where: { id }, data: fields(formData) });
  revalidatePath(`/admin/agents/${id}`);
  revalidatePath("/admin/agents");
  redirect(`/admin/agents/${id}`);
}

export async function regenerateToken(id: string) {
  if (!(await getCurrentUser())) return;
  await prisma.agent.update({ where: { id }, data: { token: randomToken(24) } });
  revalidatePath(`/admin/agents/${id}`);
}

export async function deleteAgent(id: string) {
  if (!(await getCurrentUser())) return;
  await prisma.agent.delete({ where: { id } });
  revalidatePath("/admin/agents");
  redirect("/admin/agents");
}
