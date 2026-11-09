import { requireRole } from "@/lib/auth";
import { BarChart3, Eye, TrendingUp, Video } from "lucide-react";
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
          </Card>
        ) : (
          <Card className="divide-y divide-border">
            {recent.slice(0, TOP_VIDEO_COUNT).map((video) => (
              <div
                key={video.video_id}
                className="flex items-center justify-between gap-4 p-4 text-sm"
              >
                <span className="font-medium truncate">{video.title}</span>
                <span className="flex items-center gap-1.5 text-muted shrink-0">
                  <Eye size={14} />
                  {formatViews(video.views)}
                </span>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
