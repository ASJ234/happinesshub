import { Clock, Eye, FolderOpen, Play } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DeleteVideoButton } from "@/components/videos/DeleteVideoButton";
import {
  fetchVideos,
  formatDate,
  formatViews,
} from "@/lib/videos";

export default async function MyContentPage() {
  const user = await requireRole("creator", "admin");
  const supabase = await createClient();
  const videos = await fetchVideos(supabase, {
    creatorId: user.id,
    publishedOnly: false,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FolderOpen className="text-primary" size={28} />}
        title="My Content"
        description="Your uploads — always free for you, padlocked for everyone else"
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-border text-muted text-left">
                <th className="p-4 font-medium">Video</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Views</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {videos.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted">
                    You have not uploaded any videos yet.
                  </td>
                </tr>
              )}
              {videos.map((video) => (
                <tr
                  key={video.id}
                  className="border-b border-border last:border-0 hover:bg-surface-elevated transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-16 h-10 bg-gradient-to-br from-primary/30 to-accent-red/30 rounded flex items-center justify-center shrink-0">
                        <Play size={14} className="text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{video.title}</p>
                        <p className="text-xs text-muted truncate">
                          {video.description || "No description"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <StatusBadge
                      status={
                        video.status.charAt(0).toUpperCase() + video.status.slice(1)
                      }
                    />
                  </td>
                  <td className="p-4 text-muted">
                    <span className="flex items-center gap-1">
                      <Eye size={14} />
                      {formatViews(video.views)}
                    </span>
                  </td>
                  <td className="p-4 text-muted">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {formatDate(video.created_at)}
                    </span>
                  </td>
                  <td className="p-4">
                    <DeleteVideoButton videoId={video.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
