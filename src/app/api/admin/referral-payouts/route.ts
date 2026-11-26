import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Marks a referral withdrawal as paid (its referrals are then withdrawn), or
// rejects it (its referrals count again).
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  let body: { id?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const id = String(body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "Missing withdrawal id" }, { status: 400 });
  }

  const status = body.action === "pay" ? "paid" : body.action === "reject" ? "rejected" : null;
  if (!status) {
    return NextResponse.json({ error: "Action must be pay or reject" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_referral_payout", {
    p_id: id,
    p_status: status,
  });

  if (error) {
    console.warn(`[admin/referral-payouts] review failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, status });
}
