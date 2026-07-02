import Link from "next/link";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Unsubscribe({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let done = false;
  if (token) {
    const res = await prisma.subscriber.deleteMany({ where: { token } });
    done = res.count > 0;
  }
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-xl font-semibold">{done ? "Unsubscribed" : "Subscription not found"}</h1>
      <p className="text-muted-foreground">
        {done ? "You will no longer receive status updates." : "This link may have already been used."}
      </p>
      <Link href="/" className="text-primary hover:underline">← Back to status page</Link>
    </main>
  );
}
