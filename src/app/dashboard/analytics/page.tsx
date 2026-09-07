import { BarChart3, TrendingUp, Users, Eye } from "lucide-react";

const stats = [
  { label: "Total Views", value: "24.8K", change: "+12%", icon: Eye },
  { label: "Subscribers", value: "1,204", change: "+8%", icon: Users },
  { label: "Watch Time", value: "892 hrs", change: "+15%", icon: TrendingUp },
  { label: "Engagement", value: "6.2%", change: "+2%", icon: BarChart3 },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="text-primary" size={28} />
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted text-sm">Track your channel performance and audience growth</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <stat.icon size={20} className="text-primary" />
              <span className="text-xs text-green-400 font-medium">{stat.change}</span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm text-muted mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-2xl p-8 h-64 flex items-center justify-center">
        <p className="text-muted text-sm">Analytics chart visualization coming soon</p>
      </div>
    </div>
  );
}
