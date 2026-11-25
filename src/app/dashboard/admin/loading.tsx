import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Skeleton } from "@/components/ui/Skeleton";

const PLACEHOLDER_STATS = Array.from({ length: 4 }, (_, index) => index);
const PLACEHOLDER_ROWS = Array.from({ length: 6 }, (_, index) => index);

/** Shown under the admin tabs while the next tab's page loads. */
export default function AdminLoading() {
  return (
    <LoadingScreen>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLACEHOLDER_STATS.map((stat) => (
          <div
            key={stat}
            className="bg-surface border border-border rounded-xl p-5 space-y-3"
          >
            <Skeleton className="w-10 h-10 rounded-lg" />
            <Skeleton className="h-6 w-24 rounded" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <Skeleton className="h-5 w-40 rounded" />
        </div>
        <div className="divide-y divide-border">
          {PLACEHOLDER_ROWS.map((row) => (
            <div key={row} className="p-4 flex items-center gap-4">
              <Skeleton className="h-4 flex-1 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
    </LoadingScreen>
  );
}
