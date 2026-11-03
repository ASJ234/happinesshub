import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { WhatsAppButton } from "@/components/support/WhatsAppButton";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  const supabase = await createClient();

  const { data: settings } = await supabase
    .from("app_settings")
    .select("support_whatsapp, support_message")
    .eq("id", true)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />
      <Sidebar user={user} />
      <MobileNav user={user} />
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
