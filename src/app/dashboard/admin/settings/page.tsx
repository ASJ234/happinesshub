import { Settings } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdminSettingsPanel } from "@/components/admin/AdminSettingsPanel";

export default async function AdminSettingsPage() {
  await requireRole("admin");

  const supabase = await createClient();

  const [{ data: settings }, { data: gifts }] = await Promise.all([
    supabase
      .from("app_settings")
      .select(
        "site_name, support_whatsapp, support_message, payout_method, payout_account, monthly_pool, live_allowed_weekdays"
      )
      .eq("id", true)
      .maybeSingle(),
    supabase
      .from("live_gifts")
      .select("id, name, emoji, price, active, sort_order")
      .order("sort_order", { ascending: true }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Settings className="text-primary" size={28} />}
        title="Settings"
        description="Update the WhatsApp button, payouts and live days"
      />

      <AdminSettingsPanel
        settings={
          settings ?? {
            site_name: "HAPPYPORN.COM",
            support_whatsapp: "+256700000000",
            support_message: "Hi, I need help with HAPPYPORN.COM",
            payout_method: "mtn",
            payout_account: "",
            monthly_pool: 0,
            live_allowed_weekdays: [3, 5, 6, 7],
          }
        }
        gifts={gifts ?? []}
      />
    </div>
  );
}
