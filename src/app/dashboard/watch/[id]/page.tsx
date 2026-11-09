import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CreditCard, Eye, Lock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { fetchCategoryAccess } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { VideoPlayer } from "@/components/videos/VideoPlayer";
import {
  creatorLabel,
  formatDate,
  formatViews,
  hasActiveSubscription,
  isVideoUnlocked,
  type VideoRow,
} from "@/lib/videos";

export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const supabase = await createClient();
  const { data } = await supabase
    .from("videos")
    .select("*, creator:creator_id(username, display_name)")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  const video = data as VideoRow;

  const isOwnVideo = video.creator_id === user.id;
  const isAdmin = user.role === "admin";
  if (video.status !== "published" && !isOwnVideo && !isAdmin) notFound();

  const [subscribed, accessMap] = await Promise.all([
    hasActiveSubscription(supabase, user.id),
    fetchCategoryAccess(supabase),
  ]);
  const unlocked = isVideoUnlocked(video, user, subscribed, accessMap);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Eye className="text-primary" size={28} />}
        title={video.title}
        description={`${creatorLabel(video)} · ${formatViews(video.views)} views · ${formatDate(video.created_at)}`}
      />

      <Link
        href="/dashboard/explore"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Explore
      </Link>

      {unlocked ? (
        <div className="space-y-4">
          <VideoPlayer videoId={video.id} countsViews={!isOwnVideo && !isAdmin} />
          <div className="bg-surface border border-border rounded-xl p-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-semibold">{video.title}</h2>
                <p className="text-sm text-muted mt-0.5">
                  Uploaded by {creatorLabel(video)}
                </p>
              </div>
              <span className="text-xs text-muted flex items-center gap-1">
                <Eye size={14} />
                {formatViews(video.views)} views
              </span>
            </div>
            {video.description && (
              <p className="text-sm text-muted mt-3 whitespace-pre-wrap">
                {video.description}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl p-10 max-w-lg text-center mx-auto">
          <div className="w-14 h-14 rounded-full bg-primary/15 text-primary flex items-center justify-center mx-auto mb-4">
            <Lock size={24} />
          </div>
          <h2 className="text-lg font-semibold mb-2">This video is locked</h2>
          <p className="text-sm text-muted mb-6">
            Pay the subscription fee to remove padlocks and watch every video
            on HAPPYPORN.COM — including this one.
          </p>
          <Link
            href="/dashboard/subscription"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            <CreditCard size={16} />
            Unlock videos
          </Link>
        </div>
      )}
    </div>
  );
}
