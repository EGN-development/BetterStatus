import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { AgentForm } from "@/components/admin/agent-form";
import { createAgent } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewAgentPage() {
  const pools = await prisma.pool.findMany({ orderBy: { name: "asc" } });
  return (
    <div>
      <PageHeader title="Add server" description="Create a server entry, then run the install command on it." />
      <AgentForm action={createAgent} pools={pools} />
    </div>
  );
}
