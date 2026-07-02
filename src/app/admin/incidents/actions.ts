"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { IncidentStatus, IncidentImpact } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getSettings, publicUrl } from "@/lib/settings";
import { notifySubscribers } from "@/lib/subscribers";
import { incidentStatusMeta } from "@/lib/status";

async function maybeNotify(title: string, status: IncidentStatus, body: string, notify: boolean) {
  if (!notify) return;
  const settings = await getSettings();
  await notifySubscribers({
    title: `${title} — ${incidentStatusMeta[status].label}`,
    body,
    good: status === "RESOLVED",
    url: publicUrl(settings),
  });
}

export async function createIncident(formData: FormData) {
  if (!(await getCurrentUser())) return;
  const title = String(formData.get("title") || "Incident").trim();
  const status = String(formData.get("status") || "INVESTIGATING") as IncidentStatus;
  const impact = String(formData.get("impact") || "MINOR") as IncidentImpact;
  const monitorId = String(formData.get("monitorId") || "").trim() || null;
  const body = String(formData.get("body") || "").trim() || "We are aware of an issue and investigating.";
  const isPublic = formData.get("isPublic") !== "off";
  const notify = formData.get("notify") === "on";

  const incident = await prisma.incident.create({
    data: {
      title,
      status,
      impact,
      monitorId,
      isPublic,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
      updates: { create: { status, body } },
    },
  });

  await maybeNotify(title, status, body, notify);
  revalidatePath("/admin/incidents");
  revalidatePath("/");
  redirect(`/admin/incidents/${incident.id}`);
}

export async function postUpdate(incidentId: string, formData: FormData) {
  if (!(await getCurrentUser())) return;
  const status = String(formData.get("status") || "MONITORING") as IncidentStatus;
  const body = String(formData.get("body") || "").trim();
  const notify = formData.get("notify") === "on";
  if (!body) return;

  const incident = await prisma.incident.update({
    where: { id: incidentId },
    data: {
      status,
      resolvedAt: status === "RESOLVED" ? new Date() : null,
      updates: { create: { status, body } },
    },
  });

  await maybeNotify(incident.title, status, body, notify);
  revalidatePath(`/admin/incidents/${incidentId}`);
  revalidatePath("/admin/incidents");
  revalidatePath("/");
}

export async function deleteIncident(id: string) {
  if (!(await getCurrentUser())) return;
  await prisma.incident.delete({ where: { id } });
  revalidatePath("/admin/incidents");
  redirect("/admin/incidents");
}
