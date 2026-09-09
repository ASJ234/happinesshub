import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { creatorStats } from "@/lib/mock-data";

export default function CreatorDashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={<LayoutDashboard className="text-primary" size={28} />}
        title="Creator Dashboard"
        description="Overview of your channel performance and earnings"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {creatorStats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
          />
        ))}
      </div>
    </div>
  );
}