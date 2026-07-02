import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { MaintenanceForm } from "@/components/admin/maintenance-form";
import { Button } from "@/components/ui/button";
import { updateMaintenance, deleteMaintenance } from "../actions";
import { Trash2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EditMaintenancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [maintenance, monitors] = await Promise.all([
    prisma.maintenance.findUnique({ where: { id }, include: { monitors: { select: { id: true } } } }),
    prisma.monitor.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!maintenance) notFound();
  return (
    <div>
      <PageHeader
        title={`Edit: ${maintenance.title}`}
        action={
          <form action={deleteMaintenance.bind(null, id)}>
            <Button type="submit" variant="danger" size="sm"><Trash2 className="size-4" /></Button>
          </form>
        }
      />
      <MaintenanceForm
        action={updateMaintenance.bind(null, id)}
        maintenance={maintenance}
        monitors={monitors}
        linkedIds={maintenance.monitors.map((m) => m.id)}
      />
    </div>
  );
}
