import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDate } from "./videos";

export const MAX_COMMENT_LENGTH = 1000;

interface CommentRow {
  id: string;
  video_id: string;
  video_title: string;
  parent_id: string | null;
  body: string;
  hidden: boolean;
  created_at: string;
  author_name: string;
  can_moderate: boolean;
  can_delete: boolean;
}

export interface VideoComment extends CommentRow {
  date_label: string;
  replies: VideoComment[];
}

/** Pass no video id to list every comment on videos the caller can moderate. */
export async function fetchComments(
  supabase: SupabaseClient,
  videoId?: string
): Promise<VideoComment[]> {
  const { data, error } = await supabase.rpc("list_video_comments", {
    p_video_id: videoId ?? null,
  });

  if (error) {
    console.warn(`[comments] fetch failed: ${error.message}`);
    return [];
  }

  const rows = (data ?? []) as CommentRow[];
  const comments = new Map<string, VideoComment>(
    rows.map((row) => [
      row.id,
      { ...row, date_label: formatDate(row.created_at), replies: [] },
    ])
  );

  // Rows arrive newest first, so replies are added in reverse to read oldest
  // first under their comment.
  const topLevel: VideoComment[] = [];
  for (const comment of comments.values()) {
    if (comment.parent_id) {
      comments.get(comment.parent_id)?.replies.unshift(comment);
    } else {
      topLevel.push(comment);
    }
  }

  return topLevel;
}
