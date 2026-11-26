import { AdminTabs } from "@/components/admin/AdminTabs";
import { alertBadges, getAdminAlerts } from "@/lib/admin-alerts";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const alerts = await getAdminAlerts();

  return (
    <div>
      <AdminTabs badges={alertBadges(alerts)} />
      {children}
    </div>
  );
}
