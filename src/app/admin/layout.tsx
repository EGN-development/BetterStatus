import { redirect } from "next/navigation";
import { getCurrentUser, hasAnyUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { Sidebar } from "@/components/admin/sidebar";
import { logout } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await hasAnyUser())) redirect("/setup");
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const settings = await getSettings();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar siteName={settings.siteName} userEmail={user.email} logout={logout} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
