import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  children: ReactNode;
  icon?: LucideIcon;
  className?: string;
}

/** The dashed "nothing here yet" box used by every feed. */
export function EmptyState({ children, icon: Icon, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`bg-surface border border-dashed border-border rounded-xl p-10 text-center ${className}`}
    >
      {Icon && <Icon size={28} className="text-muted mx-auto mb-3" />}
      <p className="text-sm text-muted">{children}</p>
    </div>
  );
}
