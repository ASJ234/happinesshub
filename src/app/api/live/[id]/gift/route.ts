import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Sends a gift to a running stream. The gift is paid from the sender's gift
// credit and the money is credited to the stream owner's wallet.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let body: { gift_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const giftId = (body.gift_id ?? "").trim();
  if (!giftId) {
    return NextResponse.json({ error: "Choose a gift" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("send_live_gift", {
    p_stream_id: id,
    p_gift_id: giftId,
  });

  if (error) {
    console.warn(`[live/gift] failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, id: data });
}
