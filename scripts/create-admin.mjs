// Create or reset the owner admin account.
// Usage:
//   node scripts/create-admin.mjs                 -> random password, default email
//   ADMIN_EMAIL=a@b.c ADMIN_PASSWORD=secret node scripts/create-admin.mjs
// Prints the resulting credentials. Safe to run repeatedly (idempotent upsert).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const prisma = new PrismaClient();

function genPassword(len = 20) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(len);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@local").trim().toLowerCase();
  const onlyIfEmpty = process.env.ONLY_IF_EMPTY === "1";

  if (onlyIfEmpty && (await prisma.user.count()) > 0) {
    console.log("Admin already exists — skipping.");
    return;
  }

  const password = process.env.ADMIN_PASSWORD || genPassword();
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "OWNER" },
    create: { email, passwordHash, role: "OWNER", name: "Owner" },
  });
  await prisma.settings.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } });

  console.log("\n========================================");
  console.log("  Better Status — admin credentials");
  console.log("========================================");
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
  console.log("========================================");
  console.log("  Save these now — the password is not stored in plain text.\n");
}

main()
  .catch((e) => {
    console.error("Failed to create admin:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
