import { FolderOpen, Play, Eye, Clock } from "lucide-react";

const videos = [
  { title: "Getting Started with Next.js 16", views: "2.4K", status: "Published", date: "Sep 5, 2026" },
  { title: "Dark Mode UI Design Tips", views: "1.8K", status: "Published", date: "Sep 3, 2026" },
  { title: "Stream Setup Tutorial", views: "—", status: "Draft", date: "Sep 7, 2026" },
  { title: "Weekly Vlog #12", views: "—", status: "Scheduled", date: "Sep 10, 2026" },
];

export default function MyContentPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FolderOpen className="text-primary" size={28} />
        <div>
          <h1 className="text-2xl font-bold">My Content</h1>
          <p className="text-muted text-sm">Manage your videos, drafts, and scheduled uploads</p>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted text-left">
              <th className="p-4 font-medium">Video</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Views</th>
              <th className="p-4 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr key={video.title} className="border-b border-border last:border-0 hover:bg-surface-elevated transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-10 bg-gradient-to-br from-primary/30 to-accent-red/30 rounded flex items-center justify-center">
                      <Play size={14} className="text-white" />
                    </div>
                    <span className="font-medium">{video.title}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    video.status === "Published"
                      ? "bg-green-500/20 text-green-400"
                      : video.status === "Draft"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}>
                    {video.status}
                  </span>
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
    </div>
  );
}
