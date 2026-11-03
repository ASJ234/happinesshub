import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Posts a chat message to a stream.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let body: { stream_id?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const streamId = (body.stream_id ?? "").trim();
  const text = (body.body ?? "").trim();

  if (!streamId) {
    return NextResponse.json({ error: "Missing stream" }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: "Write something first" }, { status: 400 });
  }

  if (text.length > 500) {
    return NextResponse.json(
      { error: "Messages are limited to 500 characters" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("live_chat_messages").insert({
    stream_id: streamId,
    user_id: user.id,
    body: text,
  });

  if (error) {
    console.warn(`[live/chat] failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
