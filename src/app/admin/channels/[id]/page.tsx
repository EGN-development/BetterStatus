import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { ChannelForm } from "@/components/admin/channel-form";
import { updateChannel } from "../actions";

export const dynamic = "force-dynamic";

export default async function EditChannelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const channel = await prisma.notificationChannel.findUnique({ where: { id } });
  if (!channel) notFound();
  return (
    <div>
      <PageHeader title={`Edit ${channel.name}`} />
      <ChannelForm action={updateChannel.bind(null, id)} channel={channel} />
    </div>
  );
}
