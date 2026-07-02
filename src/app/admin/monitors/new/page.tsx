import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { MonitorForm } from "@/components/admin/monitor-form";
import { createMonitor } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewMonitorPage() {
  const channels = await prisma.notificationChannel.findMany({ orderBy: { name: "asc" } });
  return (
    <div>
      <PageHeader title="New monitor" description="Configure a new check." />
      <MonitorForm action={createMonitor} channels={channels} />
    </div>
  );
}
