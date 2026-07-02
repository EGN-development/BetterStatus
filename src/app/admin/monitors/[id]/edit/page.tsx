import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { MonitorForm } from "@/components/admin/monitor-form";
import { updateMonitor } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditMonitorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [monitor, channels] = await Promise.all([
    prisma.monitor.findUnique({ where: { id }, include: { channels: { select: { id: true } } } }),
    prisma.notificationChannel.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!monitor) notFound();

  return (
    <div>
      <PageHeader title={`Edit ${monitor.name}`} />
      <MonitorForm action={updateMonitor.bind(null, id)} monitor={monitor} channels={channels} />
    </div>
  );
}
