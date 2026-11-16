import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { BarChart3, ChevronRight, Eye, Info, TrendingUp, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  fetchCreatorTotals,
  fetchRecentViewCounts,
  formatViews,
} from "@/lib/videos";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";

const RECENT_DAYS = 30;
const TOP_VIDEO_COUNT = 10;

export default async function AnalyticsPage() {
  const user = await requireRole("creator", "admin");
  const supabase = await createClient();

  const [totals, recent] = await Promise.all([
    fetchCreatorTotals(supabase, user.id),
    fetchRecentViewCounts(supabase, user.id, RECENT_DAYS),
  ]);
  const recentViews = recent.reduce((sum, video) => sum + video.views, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BarChart3 className="text-primary" size={28} />}
        title="Analytics"
        description="Track how your videos are performing"
      />

      <p className="flex items-start gap-2 text-xs text-muted">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>
          A view counts when someone else starts playing your video: once a day
          per viewer, or every play for subscribers.
          {user.role === "admin"
            ? " Admin plays are never counted."
            : " Your own plays and admin plays are never counted."}
        </span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total Views" value={formatViews(totals.views)} icon={Eye} />
        <StatCard
          label={`Views (${RECENT_DAYS} days)`}
          value={formatViews(recentViews)}
          icon={TrendingUp}
        />
        <StatCard
          label="Published Videos"
          value={totals.videos.toLocaleString("en-US")}
          icon={Video}
        />
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">
          Top videos, last {RECENT_DAYS} days
        </h2>
        {recent.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted">
            No views in the last {RECENT_DAYS} days yet.
            {totals.videos === 0 && (
              <>
                {" "}
                <Link href="/dashboard/upload" className="text-primary hover:underline">
                  Upload your first video
                </Link>{" "}
                to start getting views.
              </>
            )}
          </Card>
        ) : (
          <Card className="divide-y divide-border">
            {recent.slice(0, TOP_VIDEO_COUNT).map((video, index) => (
              <Link
                key={video.video_id}
                href={`/dashboard/watch/${video.video_id}`}
                className="flex items-center gap-4 p-4 text-sm hover:bg-surface-elevated transition-colors first:rounded-t-xl last:rounded-b-xl"
              >
                <span className="w-5 text-muted tabular-nums shrink-0">{index + 1}</span>
                <span className="font-medium truncate flex-1">{video.title}</span>
                <span className="flex items-center gap-1.5 text-muted shrink-0 tabular-nums">
                  <Eye size={14} />
                  {formatViews(video.views)}
                </span>
                <ChevronRight size={16} className="text-muted shrink-0" />
              </Link>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
