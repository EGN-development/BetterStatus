import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { MaintenanceForm } from "@/components/admin/maintenance-form";
import { createMaintenance } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewMaintenancePage() {
  const monitors = await prisma.monitor.findMany({ orderBy: { name: "asc" } });
  return (
    <div>
      <PageHeader title="Schedule maintenance" />
      <MaintenanceForm action={createMaintenance} monitors={monitors} />
    </div>
  );
}
