import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteSubscriber } from "./actions";
import { relativeTime } from "@/lib/utils";
import { Trash2, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SubscribersPage() {
  const subs = await prisma.subscriber.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <PageHeader title="Subscribers" description="People subscribed to incident updates on your public page." />
      {subs.length === 0 ? (
        <Card className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <Users className="size-6" />
          No subscribers yet.
        </Card>
      ) : (
        <Card className="divide-y divide-border">
          {subs.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  {s.target}
                  <Badge tone={s.verified ? "success" : "warning"}>{s.verified ? "Verified" : "Pending"}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{s.channel} · {relativeTime(s.createdAt)}</div>
              </div>
              <form action={deleteSubscriber.bind(null, s.id)}>
                <Button type="submit" variant="ghost" size="icon" title="Remove"><Trash2 className="size-4" /></Button>
              </form>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
