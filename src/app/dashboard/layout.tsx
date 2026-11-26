import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { WhatsAppButton } from "@/components/support/WhatsAppButton";
import { NavigationTracker } from "@/components/layout/NavigationTracker";
import { alertBadges, getAdminAlerts } from "@/lib/admin-alerts";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const [{ data: settings }, alerts] = await Promise.all([
    supabase
      .from("app_settings")
      .select("support_whatsapp, support_message")
      .eq("id", true)
      .maybeSingle(),
    getAdminAlerts(),
  ]);
  const badges = alertBadges(alerts);

  return (
    <div className="min-h-screen bg-background">
      <NavigationTracker />
      <Header user={user} alerts={alerts} badges={badges} />
      <Sidebar user={user} badges={badges} />
      <main className="lg:ml-60 pt-[6.75rem] lg:pt-14 min-h-screen">
        <div className="px-4 sm:px-6 py-4 sm:py-6 pb-24 lg:pb-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
      {settings?.support_whatsapp && (
        <WhatsAppButton
          number={settings.support_whatsapp}
          message={settings.support_message}
        />
      )}
    </div>
  );
}
