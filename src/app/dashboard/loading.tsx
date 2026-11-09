const PLACEHOLDER_CARDS = Array.from({ length: 8 }, (_, index) => index);

export default function DashboardLoading() {
  return (
    <div role="status" className="space-y-8 animate-pulse">
      <span className="sr-only">Loading</span>

      <div className="space-y-2">
        <div className="h-7 w-48 rounded-lg bg-surface-elevated" />
        <div className="h-4 w-72 max-w-full rounded bg-surface-elevated" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {PLACEHOLDER_CARDS.map((card) => (
          <div
            key={card}
            className="bg-surface border border-border rounded-xl overflow-hidden"
          >
            <div className="aspect-video bg-surface-elevated" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-4/5 rounded bg-surface-elevated" />
              <div className="h-3 w-1/2 rounded bg-surface-elevated" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
