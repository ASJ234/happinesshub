import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Asks for permission to go live. The request waits for an admin, and it can
// only be scheduled on a day the site allows going live.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  if (user.role !== "creator" && user.role !== "admin") {
    return NextResponse.json(
      { error: "Only creators can go live" },
      { status: 403 }
    );
  }

  let body: { title?: string; description?: string; scheduled_for?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const title = (body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "A title is required" }, { status: 400 });
  }

  let scheduled: string | null = null;
  if (body.scheduled_for) {
    scheduled = new Date(body.scheduled_for).toISOString();
    if (Number.isNaN(Date.parse(scheduled))) {
      return NextResponse.json(
        { error: "That schedule is not a valid date" },
        { status: 400 }
      );
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_live_stream", {
    p_title: title,
    p_description: (body.description ?? "").trim() || null,
    p_scheduled_for: scheduled,
  });

  if (error) {
    console.warn(`[live/request] failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, id: data });
}
