import { LayoutDashboard, TrendingUp, DollarSign, Users } from "lucide-react";

export default function CreatorDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <LayoutDashboard className="text-primary" size={28} />
        <div>
          <h1 className="text-2xl font-bold">Creator Dashboard</h1>
          <p className="text-muted text-sm">Overview of your channel performance and earnings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Revenue (30d)", value: "$1,248", icon: DollarSign },
          { label: "New Subscribers", value: "+86", icon: Users },
          { label: "Growth Rate", value: "+14%", icon: TrendingUp },
        ].map((item) => (
          <div key={item.label} className="bg-surface border border-border rounded-xl p-5">
            <item.icon size={20} className="text-primary mb-3" />
            <p className="text-2xl font-bold">{item.value}</p>
            <p className="text-sm text-muted mt-1">{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
