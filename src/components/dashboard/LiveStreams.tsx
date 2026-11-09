import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { fetchLiveStreams } from "@/lib/live";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { LiveStreamCard } from "@/components/live/LiveStreamCard";

export async function LiveStreams() {
  const user = await getCurrentUser();
  const canGoLive = user?.role === "creator" || user?.role === "admin";
  // Live streams are only readable by signed-in users.
  const streams = user
    ? await fetchLiveStreams(await createClient(), { status: "live", limit: 3 })
    : [];

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Live Stream</h2>
          {streams.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Live now
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/live"
            className="text-sm text-primary hover:text-primary-hover font-medium"
          >
            See all
          </Link>
          {canGoLive && (
            <Link
              href="/dashboard/live-studio"
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Go Live
            </Link>
          )}
        </div>
      </div>

      {streams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {streams.map((stream) => (
            <LiveStreamCard key={stream.id} stream={stream} />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center text-sm text-muted">
          {user ? (
            "Nobody is live right now. Check back soon."
          ) : (
            <>
              <Link
                href="/login"
                className="text-primary hover:text-primary-hover font-medium"
              >
                Sign in
              </Link>{" "}
              to watch live streams.
            </>
          )}
        </Card>
      )}
    </section>
  );
}
