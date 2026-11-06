import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { completeMuxLiveStream, isMuxApiConfigured } from "@/lib/mux";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Ends a running stream, completing the Mux ingest point first when present.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  // Fetch mux_live_stream_id via the admin client so RLS cannot hide it, but
  // still verify ownership before acting.
  const admin = createAdminClient();
  const { data: stream, error: fetchError } = await admin
    .from("live_streams")
    .select("id, creator_id, status, mux_live_stream_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !stream) {
    return NextResponse.json({ error: "Stream not found" }, { status: 404 });
  }

  const canEnd = stream.creator_id === user.id || user.role === "admin";
  if (!canEnd) {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  if (stream.status !== "live") {
    return NextResponse.json(
      { error: "Stream is not currently live" },
      { status: 400 }
    );
  }

  // Signal the end to Mux. A failure here does not block the DB update — the
  // creator must still be able to mark their stream as ended.
  if (stream.mux_live_stream_id && isMuxApiConfigured()) {
    await completeMuxLiveStream(stream.mux_live_stream_id).catch((err: unknown) => {
      console.warn(`[live/end] could not complete Mux stream: ${String(err)}`);
    });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("end_live_stream", { p_id: id });

  if (error) {
    console.warn(`[live/end] RPC failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
