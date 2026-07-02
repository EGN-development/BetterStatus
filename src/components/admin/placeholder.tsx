import { PageHeader } from "./page-header";
import { Card } from "@/components/ui/card";

export function Placeholder({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <Card className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Coming up…
      </Card>
    </div>
  );
}
