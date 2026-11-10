import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

const TONES = {
  green: {
    border: "border-green-500/40",
    badge: "bg-green-500/15 text-green-400",
    title: "text-green-400",
  },
  yellow: {
    border: "border-yellow-500/40",
    badge: "bg-yellow-500/15 text-yellow-400",
    title: "text-yellow-400",
  },
} as const;

interface StatusCardProps {
  tone: keyof typeof TONES;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  /** Label/value rows; rows with an empty value are skipped. */
  rows: [label: string, value: ReactNode][];
}

/** A subscription status with its details, e.g. "Subscription active". */
export function StatusCard({ tone, icon: Icon, title, subtitle, rows }: StatusCardProps) {
  const colors = TONES[tone];
  return (
    <div className={`bg-surface border-2 ${colors.border} rounded-xl p-8 max-w-lg`}>
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-full ${colors.badge} flex items-center justify-center`}
        >
          <Icon size={20} />
        </div>
        <div>
          <h2 className={`font-semibold ${colors.title}`}>{title}</h2>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
      </div>
      <dl className="text-sm text-muted space-y-1 border-t border-border pt-3">
        {rows
          .filter(([, value]) => value !== null && value !== undefined && value !== "")
          .map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt>{label}</dt>
              <dd className="text-foreground text-right">{value}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}
