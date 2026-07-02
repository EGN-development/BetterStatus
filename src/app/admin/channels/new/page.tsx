import { PageHeader } from "@/components/admin/page-header";
import { ChannelForm } from "@/components/admin/channel-form";
import { createChannel } from "../actions";

export const dynamic = "force-dynamic";

export default function NewChannelPage() {
  return (
    <div>
      <PageHeader title="New channel" description="Configure a notification channel." />
      <ChannelForm action={createChannel} />
    </div>
  );
}
