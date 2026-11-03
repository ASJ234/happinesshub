import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Approves or rejects a gift top-up.
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

  const id = (body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "Missing deposit id" }, { status: 400 });
  }

  const status =
    body.action === "approve" ? "approved" : body.action === "reject" ? "rejected" : null;

  if (!status) {
    return NextResponse.json(
      { error: "Action must be approve or reject" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_review_gift_deposit", {
    p_id: id,
    p_status: status,
  });

  if (error) {
    console.warn(`[admin/gifts] review failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, status });
}
