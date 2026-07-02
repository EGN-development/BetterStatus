import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChannelTestButton } from "@/components/admin/channel-test-button";
import { deleteChannel, testChannel } from "./actions";
import { Plus, Pencil, Trash2, Bell } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ChannelsPage() {
  const channels = await prisma.notificationChannel.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { monitors: true } } },
  });

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Alert channels used when monitors change state. Attach them to monitors."
        action={<Button asChild><Link href="/admin/channels/new"><Plus className="size-4" /> New channel</Link></Button>}
      />

      {channels.length === 0 ? (
        <Card className="flex h-48 flex-col items-center justify-center gap-3 text-center">
          <Bell className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No channels yet. Add Telegram, email, Slack, Discord, webhook or API.</p>
          <Button asChild><Link href="/admin/channels/new"><Plus className="size-4" /> Add a channel</Link></Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {channels.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-2 font-medium">
                  {c.name}
                  <Badge tone={c.enabled ? "success" : "muted"}>{c.enabled ? "Enabled" : "Disabled"}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{c.type} · attached to {c._count.monitors} monitor(s)</div>
              </div>
              <div className="flex items-center gap-2">
                <ChannelTestButton test={testChannel.bind(null, c.id)} />
                <Button asChild variant="outline" size="sm"><Link href={`/admin/channels/${c.id}`}><Pencil className="size-4" /></Link></Button>
                <form action={deleteChannel.bind(null, c.id)}>
                  <Button type="submit" variant="danger" size="sm"><Trash2 className="size-4" /></Button>
                </form>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
