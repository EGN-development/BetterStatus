"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

function parseFields(formData: FormData) {
  const start = new Date(String(formData.get("scheduledStart") || ""));
  const end = new Date(String(formData.get("scheduledEnd") || ""));
  return {
    title: String(formData.get("title") || "Maintenance").trim(),
    body: String(formData.get("body") || "").trim() || null,
    scheduledStart: isNaN(start.getTime()) ? new Date() : start,
    scheduledEnd: isNaN(end.getTime()) ? new Date(Date.now() + 3600_000) : end,
    isPublic: formData.get("isPublic") !== "off",
    notifySubscribers: formData.get("notifySubscribers") === "on",
    monitorIds: formData.getAll("monitors").map(String),
  };
}

export async function createMaintenance(formData: FormData) {
  if (!(await getCurrentUser())) return;
  const f = parseFields(formData);
  const m = await prisma.maintenance.create({
    data: {
      title: f.title,
      body: f.body,
      scheduledStart: f.scheduledStart,
      scheduledEnd: f.scheduledEnd,
      isPublic: f.isPublic,
      notifySubscribers: f.notifySubscribers,
      monitors: f.monitorIds.length ? { connect: f.monitorIds.map((id) => ({ id })) } : undefined,
    },
  });
  revalidatePath("/admin/maintenance");
  revalidatePath("/");
  redirect(`/admin/maintenance/${m.id}`);
}

export async function updateMaintenance(id: string, formData: FormData) {
  if (!(await getCurrentUser())) return;
  const f = parseFields(formData);
  await prisma.maintenance.update({
    where: { id },
    data: {
      title: f.title,
      body: f.body,
      scheduledStart: f.scheduledStart,
      scheduledEnd: f.scheduledEnd,
      isPublic: f.isPublic,
      notifySubscribers: f.notifySubscribers,
      monitors: { set: f.monitorIds.map((mid) => ({ id: mid })) },
    },
  });
  revalidatePath("/admin/maintenance");
  revalidatePath(`/admin/maintenance/${id}`);
  revalidatePath("/");
  redirect(`/admin/maintenance/${id}`);
}

export async function deleteMaintenance(id: string) {
  if (!(await getCurrentUser())) return;
  await prisma.maintenance.delete({ where: { id } });
  revalidatePath("/admin/maintenance");
  redirect("/admin/maintenance");
}
