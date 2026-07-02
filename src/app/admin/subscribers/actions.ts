"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function deleteSubscriber(id: string) {
  if (!(await getCurrentUser())) return;
  await prisma.subscriber.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/subscribers");
}
