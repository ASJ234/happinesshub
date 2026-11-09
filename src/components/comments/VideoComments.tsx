import { fetchComments } from "@/lib/comments";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { CommentForm } from "./CommentForm";
import { CommentList } from "./CommentList";

interface VideoCommentsProps {
  videoId: string;
  canComment: boolean;
}

export async function VideoComments({ videoId, canComment }: VideoCommentsProps) {
  const comments = await fetchComments(await createClient(), videoId);

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Comments</h2>

      {canComment && <CommentForm videoId={videoId} />}

      {comments.length > 0 ? (
        <CommentList comments={comments} canReply={canComment} />
      ) : (
        <Card className="p-8 text-center text-sm text-muted">No comments yet.</Card>
      )}
    </section>
  );
}
