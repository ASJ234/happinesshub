import { Shield, Users, Video, AlertTriangle } from "lucide-react";

const users = [
  { name: "Jane Viewer", email: "viewer@happinesshub.com", role: "Viewer", status: "Active" },
  { name: "John Creator", email: "creator@happinesshub.com", role: "Creator", status: "Active" },
  { name: "Alex Admin", email: "admin@happinesshub.com", role: "Admin", status: "Active" },
  { name: "Spam Bot", email: "bot@spam.com", role: "Viewer", status: "Banned" },
];

export default function AdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="text-primary" size={28} />
        <div>
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <p className="text-muted text-sm">Manage users, content moderation, and platform settings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Users", value: "12,847", icon: Users },
          { label: "Active Videos", value: "3,421", icon: Video },
          { label: "Reports Pending", value: "7", icon: AlertTriangle },
        ].map((item) => (
          <div key={item.label} className="bg-surface border border-border rounded-xl p-5">
            <item.icon size={20} className="text-primary mb-3" />
            <p className="text-2xl font-bold">{item.value}</p>
            <p className="text-sm text-muted mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">User Management</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted text-left">
              <th className="p-4 font-medium">User</th>
              <th className="p-4 font-medium">Role</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.email} className="border-b border-border last:border-0 hover:bg-surface-elevated">
                <td className="p-4">
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-muted">{user.email}</p>
                </td>
                <td className="p-4">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/20 text-primary">
                    {user.role}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    user.status === "Active"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="p-4">
                  <button className="text-xs text-primary hover:text-primary-hover font-medium">
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
