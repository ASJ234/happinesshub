import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { analyticsStats } from "@/lib/mock-data";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BarChart3 className="text-primary" size={28} />}
        title="Analytics"
        description="Track your channel performance and audience growth"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {analyticsStats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            change={stat.change}
          />
        ))}
      </div>

      <Card className="p-8 h-64 flex items-center justify-center">
        <p className="text-muted text-sm">Analytics chart visualization coming soon</p>
      </Card>
    </div>
  );
}