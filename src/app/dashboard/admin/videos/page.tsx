import { Video } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import {
  VideoReviewTable,
  type AdminVideoRow,
} from "@/components/admin/VideoReviewTable";

export default async function AdminVideosPage() {
  await requireRole("admin");

  const supabase = await createClient();
  const { data } = await supabase
    .from("videos")
    .select("id, title, category, status, views, created_at, creator:creator_id(username, display_name)")
    .eq("status", "pending_review")
    .order("created_at", { ascending: true });

  const pending = ((data ?? []) as unknown[]).map((row) => {
    const video = row as Omit<AdminVideoRow, "creator"> & {
      creator: AdminVideoRow["creator"] | AdminVideoRow["creator"][];
    };
    return {
      ...video,
      creator: Array.isArray(video.creator)
        ? (video.creator[0] ?? null)
        : (video.creator ?? null),
    };
  }) as AdminVideoRow[];

  const { data: rejected } = await supabase
    .from("videos")
    .select("id")
    .eq("status", "rejected");

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Video className="text-primary" size={28} />}
        title="Video Review"
        description="Every upload waits for approval before it appears in the feeds"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Waiting for review"
          value={pending.length.toLocaleString()}
          icon={Video}
        />
        <StatCard
          label="Rejected"
          value={(rejected ?? []).length.toLocaleString()}
          icon={Video}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Pending uploads</h2>
          <p className="text-xs text-muted mt-0.5">
            Approving publishes the video straight away
          </p>
        </div>
        <VideoReviewTable videos={pending} />
      </Card>
    </div>
  );
}
