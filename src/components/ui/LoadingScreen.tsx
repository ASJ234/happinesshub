import { Skeleton } from "./Skeleton";

/**
 * Wrapper for a route's loading state: pulses its children and announces
 * "Loading" to screen readers, under a placeholder page title.
 */
export function LoadingScreen({ children }: { children: React.ReactNode }) {
  return (
    <div role="status" className="space-y-8 animate-pulse">
      <span className="sr-only">Loading</span>

      <div className="space-y-2">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <Skeleton className="h-4 w-72 max-w-full rounded" />
      </div>

      {children}
    </div>
  );
}
