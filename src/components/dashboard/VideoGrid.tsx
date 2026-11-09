import Link from "next/link";
import { Eye, Lock, Play } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchCategoryAccess } from "@/lib/categories";
import {
  creatorLabel,
  fetchVideos,
  formatDate,
  formatViews,
  hasActiveSubscription,
  isVideoUnlocked,
  thumbnailUrl,
} from "@/lib/videos";

interface VideoGridProps {
  category?: string;
  creatorId?: string;
  search?: string;
  publishedOnly?: boolean;
  limit?: number;
  emptyMessage?: string;
}

export async function VideoGrid({
  category,
  creatorId,
  search,
  publishedOnly = true,
  limit,
  emptyMessage = "No videos here yet. Check back soon.",
}: VideoGridProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const [videos, subscribed, accessMap] = await Promise.all([
    fetchVideos(supabase, { category, creatorId, search, publishedOnly, limit }),
    hasActiveSubscription(supabase, user.id),
    fetchCategoryAccess(supabase),
  ]);

  if (videos.length === 0) {
    return (
      <div className="bg-surface border border-dashed border-border rounded-xl p-10 text-center">
        <Play size={28} className="text-muted mx-auto mb-3" />
        <p className="text-sm text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {videos.map((video) => {
        const unlocked = isVideoUnlocked(video, user, subscribed, accessMap);
        const href = unlocked
          ? `/dashboard/watch/${video.id}`
          : "/dashboard/subscription";
        const thumb = thumbnailUrl(supabase, video.thumbnail_path);
        const isOwn = video.creator_id === user.id;

        return (
          <Link
            key={video.id}
            href={href}
            className="bg-surface border border-border rounded-xl overflow-hidden group hover:border-primary/30 transition-colors"
          >
            <div className="relative aspect-video bg-gradient-to-br from-primary/30 to-accent-red/30">
              {thumb && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thumb}
                  alt={video.title}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}

              {!unlocked && (
                <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
                    <Lock size={18} className="text-white" />
                  </div>
                  <span className="text-xs text-white/90 font-medium px-3 text-center">
                    Subscribe to watch
                  </span>
                </div>
              )}

              {unlocked && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center">
                    <Play size={18} className="text-white ml-0.5" fill="currentColor" />
                  </div>
                </div>
              )}

              <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-medium px-2 py-0.5 rounded">
                {isOwn ? "Your video" : unlocked ? "Unlocked" : "Locked"}
              </span>
            </div>

            <div className="p-3">
              <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                {video.title}
              </h3>
              <div className="flex items-center justify-between gap-2 mt-2 text-[11px] text-muted">
                <span className="truncate">{creatorLabel(video)}</span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="flex items-center gap-1">
                    <Eye size={11} />
                    {formatViews(video.views)}
                  </span>
                  <span>{formatDate(video.created_at)}</span>
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
