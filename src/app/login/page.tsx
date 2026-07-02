import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { login } from "./actions";
import { getCurrentUser, hasAnyUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!(await hasAnyUser())) redirect("/setup");
  if (await getCurrentUser()) redirect("/admin");
  const settings = await getSettings();
  return <AuthForm action={login} mode="login" siteName={settings.siteName} />;
}
