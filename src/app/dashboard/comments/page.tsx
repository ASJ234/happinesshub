import { requireRole } from "@/lib/auth";
import { MessageCircle } from "lucide-react";
import { fetchComments } from "@/lib/comments";
import { createClient } from "@/lib/supabase/server";
import { CommentList } from "@/components/comments/CommentList";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

export default async function CommentsPage() {
  const user = await requireRole("creator", "admin");

  const comments = await fetchComments(await createClient());
  const all = comments.flatMap((comment) => [comment, ...comment.replies]);
  const hidden = all.filter((comment) => comment.hidden).length;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<MessageCircle className="text-primary" size={28} />}
        title="Comments"
        description={
          user.role === "admin"
            ? "Reply to and moderate comments on every video"
            : "Reply to and moderate comments on your videos"
        }
      />

      {all.length > 0 && (
        <p className="text-sm text-muted">
          {all.length.toLocaleString()} comment{all.length === 1 ? "" : "s"}
          {hidden > 0 && ` · ${hidden} hidden from viewers`}. Hidden comments
          stay visible to you and can be unhidden.
        </p>
      )}

      {comments.length > 0 ? (
        <CommentList comments={comments} canReply showVideoTitle />
      ) : (
        <Card className="p-8 text-center text-sm text-muted">
          No comments yet. When viewers comment on your videos, they appear
          here for you to reply to, hide or delete.
        </Card>
      )}
    </div>
  );
}
