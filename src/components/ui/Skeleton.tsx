interface SkeletonProps {
  className?: string;
}

/** A grey placeholder block; size and rounding come from `className`. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`bg-surface-elevated ${className}`} />;
}
