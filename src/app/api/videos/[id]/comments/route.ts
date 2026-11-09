import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { MAX_COMMENT_LENGTH } from "@/lib/comments";
import { rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const COMMENTS_PER_MINUTE = 10;

// Posts a comment or a reply. The database decides whether the caller can
// comment on this video.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  if (!rateLimit(`comment:${user.id}`, COMMENTS_PER_MINUTE)) {
    return NextResponse.json(
      { error: "You are commenting too quickly. Try again in a minute." },
      { status: 429 }
    );
  }

  let body: { body?: unknown; parentId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const text = typeof body.body === "string" ? body.body.trim() : "";
  if (!text || text.length > MAX_COMMENT_LENGTH) {
    return NextResponse.json(
      { error: `Comments must be between 1 and ${MAX_COMMENT_LENGTH} characters` },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_video_comment", {
    p_video_id: id,
    p_body: text,
    p_parent_id: typeof body.parentId === "string" ? body.parentId : null,
  });

  if (error) {
    console.warn(`[comments] post failed: ${error.message}`);
    return NextResponse.json(
      { error: error.code === "P0001" ? error.message : "Could not post the comment" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
