"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, createSession, hasAnyUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export async function setupOwner(_prev: unknown, formData: FormData) {
  if (await hasAnyUser()) return { error: "Setup already completed." };

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !email.includes("@")) return { error: "Valid email required." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const user = await prisma.user.create({
    data: {
      email,
      name: name || null,
      passwordHash: await hashPassword(password),
      role: "OWNER",
    },
  });
  await getSettings(); // ensure singleton exists
  await createSession(user.id);
  redirect("/admin");
}
