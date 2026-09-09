const STATUS_STYLES: Record<string, string> = {
  Published: "bg-green-500/20 text-green-400",
  Active: "bg-green-500/20 text-green-400",
  Draft: "bg-yellow-500/20 text-yellow-400",
  Scheduled: "bg-blue-500/20 text-blue-400",
  Banned: "bg-red-500/20 text-red-400",
  Viewer: "bg-primary/20 text-primary",
  Creator: "bg-purple-500/20 text-purple-400",
  Admin: "bg-accent-red/10 text-accent-red",
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? "bg-surface-elevated text-muted";
  return (
    <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full ${style}`}>
      {status}
    </span>
  );
}