import { FolderOpen, Play, Eye, Clock } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { mockVideos } from "@/lib/mock-data";

export default function MyContentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={<FolderOpen className="text-primary" size={28} />}
        title="My Content"
        description="Manage your videos, drafts, and scheduled uploads"
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="border-b border-border text-muted text-left">
                <th className="p-4 font-medium">Video</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Views</th>
                <th className="p-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {mockVideos.map((video) => (
                <tr key={video.title} className="border-b border-border last:border-0 hover:bg-surface-elevated transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-16 h-10 bg-gradient-to-br from-primary/30 to-accent-red/30 rounded flex items-center justify-center shrink-0">
                        <Play size={14} className="text-white" />
                      </div>
                      <span className="font-medium">{video.title}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={video.status} />
                  </td>
                  <td className="p-4 text-muted">
                    <span className="flex items-center gap-1">
                      <Eye size={14} />
                      {video.views}
                    </span>
                  </td>
                  <td className="p-4 text-muted">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {video.date}
                    </span>
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