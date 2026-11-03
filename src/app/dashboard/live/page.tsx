import { Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { CategoryFeed } from "@/components/dashboard/CategoryFeed";
import { LiveStreamCard } from "@/components/live/LiveStreamCard";
import { fetchLiveStreams } from "@/lib/live";
import { liveDaySummary } from "@/lib/live";

export default async function LivePage() {
  const supabase = await createClient();
  const streams = await fetchLiveStreams(supabase, { limit: 30 });

  const liveNow = streams.filter((stream) => stream.status === "live");
  const upcoming = streams.filter(
    (stream) => stream.status === "approved" || stream.status === "pending"
  );
  const ended = streams.filter((stream) => stream.status === "ended");

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Radio className="text-primary" size={28} />}
        title="Live"
        description={`Going live is allowed on ${liveDaySummary()}`}
      />

      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold">Live now</h2>
          {liveNow.length > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-muted">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              {liveNow.length} active
            </span>
          )}
        </div>

        {liveNow.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted">
            Nobody is live right now. Check the schedule below.
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {liveNow.map((stream) => (
              <LiveStreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        )}
      </section>

      {upcoming.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Coming up</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcoming.map((stream) => (
              <LiveStreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        </section>
      )}

      {ended.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-4">Recently ended</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ended.map((stream) => (
              <LiveStreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        </section>
      )}

      <CategoryFeed
        icon={Radio}
        title="Live recordings"
        description="Every finished broadcast is archived here"
        category="live"
      />
    </div>
  );
}
