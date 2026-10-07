import { getCurrentUser } from "@/lib/auth";
import { Settings } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { RoleSection } from "@/components/settings/RoleSection";

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
        <div>
          <label className="text-sm text-muted block mb-1.5">Display Name</label>
          <input
            type="text"
            defaultValue={user?.name}
            className="w-full bg-surface-elevated border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="text-sm text-muted block mb-1.5">Username</label>
          <input
            type="text"
            defaultValue={user?.username}
            className="w-full bg-surface-elevated border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="text-sm text-muted block mb-1.5">Role</label>
          {user && <RoleSection user={user} />}
        </div>
        <button className="gradient-brand text-white font-medium px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity">
          Save Changes
        </button>
      </div>
    </div>
  );
}
