import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { setupOwner } from "./actions";
import { hasAnyUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (await hasAnyUser()) redirect("/login");
  const settings = await getSettings();
  return <AuthForm action={setupOwner} mode="setup" siteName={settings.siteName} />;
}
