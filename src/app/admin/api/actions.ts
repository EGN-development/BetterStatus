"use server";

import { revalidatePath } from "next/cache";
import { updateSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";

export async function saveApiSettings(_prev: unknown, formData: FormData) {
  if (!(await getCurrentUser())) return { error: "Unauthorized" };
  await updateSettings({
    publicApiEnabled: formData.get("publicApiEnabled") === "on",
    apiKey: String(formData.get("apiKey") || "").trim() || null,
    apiMonitors: formData.get("apiMonitors") === "on",
    apiIncidents: formData.get("apiIncidents") === "on",
    apiMaintenance: formData.get("apiMaintenance") === "on",
    apiUptime: formData.get("apiUptime") === "on",
    apiMetrics: formData.get("apiMetrics") === "on",
  });
  revalidatePath("/admin/api");
  return { ok: true };
}
