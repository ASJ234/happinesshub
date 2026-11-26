import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CountBadge } from "@/components/ui/CountBadge";
import type { AdminAlert } from "@/lib/admin-alerts";

/** The "needs your attention" notices at the top of the admin overview. */
export function AdminAlertList({ alerts }: { alerts: AdminAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <Link
          key={alert.href}
          href={alert.href}
          className="flex items-center gap-3 text-sm border border-yellow-500/30 bg-yellow-500/10 text-yellow-300 rounded-lg px-4 py-3 hover:bg-yellow-500/15 transition-colors"
        >
          <CountBadge count={alert.count} />
          <span className="flex-1 font-medium">{alert.label}</span>
          <span className="inline-flex items-center gap-1 text-xs">
            Review <ChevronRight size={14} />
          </span>
        </Link>
      ))}
    </div>
  );
}
