import type { LucideIcon } from "lucide-react";
import { Card } from "./Card";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  change?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, change, className }: StatCardProps) {
  return (
    <Card className={`p-5 ${className ?? ""}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
          <Icon size={20} />
        </div>
        {change && (
          <span className="text-xs text-green-400 font-medium">{change}</span>
        )}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted mt-1">{label}</p>
    </Card>
  );
}