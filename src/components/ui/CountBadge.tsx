interface CountBadgeProps {
  count: number;
  className?: string;
}

/** A small red count pill, e.g. on a nav item; hidden when the count is 0. */
export function CountBadge({ count, className = "" }: CountBadgeProps) {
  if (count <= 0) return null;
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-accent-red text-white text-[11px] font-semibold leading-none ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
