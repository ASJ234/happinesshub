import { getCurrentUser } from "@/lib/auth";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { RoleSection } from "@/components/settings/RoleSection";
import { AccountDetails } from "@/components/settings/AccountDetails";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Settings className="text-primary" size={28} />}
        title="Settings"
        description="Manage your account and preferences"
      />

      <div className="bg-surface border border-border rounded-xl p-6 max-w-lg space-y-5">
        {user && <AccountDetails user={user} />}
        <div>
          <label className="text-sm text-muted block mb-1.5">Role</label>
          {user && <RoleSection user={user} />}
        </div>
      </div>
    </div>
  );
}
