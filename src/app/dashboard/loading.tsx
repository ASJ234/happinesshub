import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { Skeleton } from "@/components/ui/Skeleton";

const PLACEHOLDER_CARDS = Array.from({ length: 8 }, (_, index) => index);

export default function DashboardLoading() {
  return (
    <LoadingScreen>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {PLACEHOLDER_CARDS.map((card) => (
          <div
            key={card}
            className="bg-surface border border-border rounded-xl overflow-hidden"
          >
            <Skeleton className="aspect-video" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-4/5 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    </LoadingScreen>
  );
}
