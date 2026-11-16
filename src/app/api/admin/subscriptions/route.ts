import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Admin approves/rejects a pending deposit request, or revokes an active
// subscription. Approval opens the subscriber's padlocks immediately;
// revoking closes them immediately.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const body = await request.json();
  const id = typeof body.id === "string" ? body.id : "";
  const action = body.action;

  if (!id || !["approve", "reject", "revoke"].includes(action)) {
    return NextResponse.json(
      { error: "Provide an id and action (approve|reject|revoke)" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } =
    action === "revoke"
      ? await supabase.rpc("admin_revoke_subscription", { p_id: id })
      : await supabase.rpc("admin_review_subscription", {
          p_id: id,
          p_status: action === "approve" ? "active" : "rejected",
        });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not review request" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
