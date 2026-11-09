import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

function failure(action: string, error: { code?: string; message: string }) {
  console.warn(`[comments] ${action} failed: ${error.message}`);
  return NextResponse.json(
    { error: error.code === "P0001" ? error.message : `Could not ${action} the comment` },
    { status: 400 }
  );
}

// Hides or restores a comment. The database checks the caller may moderate it.
export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let body: { hidden?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof body.hidden !== "boolean") {
    return NextResponse.json({ error: "hidden must be true or false" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_video_comment_hidden", {
    p_id: id,
    p_hidden: body.hidden,
  });

  return error ? failure("update", error) : NextResponse.json({ success: true });
}

// Deletes a comment and its replies. The database checks the caller may do so.
export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_video_comment", { p_id: id });

  return error ? failure("delete", error) : NextResponse.json({ success: true });
}
