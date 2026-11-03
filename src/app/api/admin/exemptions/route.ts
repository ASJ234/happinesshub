import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Exempts a creator from upload verification, or puts them back under review.
// The column itself is never writable by regular users; this calls the
// security-definer RPC instead.
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  let body: { id?: string; exempt?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  if (typeof body.exempt !== "boolean") {
    return NextResponse.json(
      { error: "exempt must be true or false" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_verification_exemption", {
    p_user_id: id,
    p_exempt: body.exempt,
  });

  if (error) {
    console.warn(`[admin/exemptions] failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, exempt: body.exempt });
}
