import { PageHeader } from "@/components/admin/page-header";
import { ApiSettingsForm } from "@/components/admin/api-settings-form";
import { getSettings, publicUrl } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function ApiPage() {
  const settings = await getSettings();
  const endpoint = `${publicUrl(settings)}/api/v1/status`;
  return (
    <div>
      <PageHeader title="API" description="Expose a public read API for your status data." />
      <ApiSettingsForm settings={settings} endpoint={endpoint} />
    </div>
  );
}
