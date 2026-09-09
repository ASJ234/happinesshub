import { getCurrentUser } from "@/lib/auth";
import { Settings } from "lucide-react";
import { ROLE_LABELS } from "@/lib/roles";
import { PageHeader } from "@/components/ui/PageHeader";

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
          <div className="flex items-center gap-2">
            <span className="bg-primary/20 text-primary text-sm font-medium px-3 py-1.5 rounded-lg">
              {user ? ROLE_LABELS[user.role] : "—"}
            </span>
            <span className="text-xs text-muted">Contact admin to change role</span>
          </div>
        </div>
        <button className="gradient-brand text-white font-medium px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity">
          Save Changes
        </button>
      </div>
    </div>
  );
}
