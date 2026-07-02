import { prisma } from "./db";
import type { Settings } from "@prisma/client";

export const DEFAULT_SETTINGS_ID = "singleton";

export async function getSettings(): Promise<Settings> {
  // Atomic upsert avoids a race on first run when concurrent renders
  // both try to create the singleton row.
  return prisma.settings.upsert({
    where: { id: DEFAULT_SETTINGS_ID },
    update: {},
    create: { id: DEFAULT_SETTINGS_ID },
  });
}

export async function updateSettings(
  data: Partial<Omit<Settings, "id" | "updatedAt">>
): Promise<Settings> {
  return prisma.settings.upsert({
    where: { id: DEFAULT_SETTINGS_ID },
    create: { id: DEFAULT_SETTINGS_ID, ...data },
    update: data,
  });
}

export function publicUrl(settings?: Settings | null): string {
  return (
    settings?.publicUrl ||
    process.env.PUBLIC_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
