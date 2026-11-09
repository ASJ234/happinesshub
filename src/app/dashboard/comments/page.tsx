import { requireRole } from "@/lib/auth";
import { MessageCircle } from "lucide-react";
import { fetchComments } from "@/lib/comments";
import { createClient } from "@/lib/supabase/server";
import { CommentList } from "@/components/comments/CommentList";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

export default async function CommentsPage() {
  await requireRole("creator", "admin");

  const comments = await fetchComments(await createClient());

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<MessageCircle className="text-primary" size={28} />}
        title="Comments"
        description="Reply to and moderate comments on your videos"
      />

      {comments.length > 0 ? (
        <CommentList comments={comments} canReply showVideoTitle />
      ) : (
        <Card className="p-8 text-center text-sm text-muted">No comments yet.</Card>
      )}
    </div>
  );
}
