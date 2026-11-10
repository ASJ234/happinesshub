import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/roles";

const VALID_ROLES: Role[] = ["viewer", "creator", "provider", "vendor", "admin"];

// Admin CRUD on user profiles. Role changes go through RLS (admin policy)
// plus protect_profile_role(); deletion runs through the admin_delete_user RPC.
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const body = await request.json();
  const targetId = typeof body.id === "string" ? body.id : "";
  if (!targetId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  const updates: { role?: Role; display_name?: string } = {};

  if (body.role !== undefined) {
    if (!VALID_ROLES.includes(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if (targetId === user.id && body.role !== "admin") {
      return NextResponse.json(
        { error: "You cannot demote your own account" },
        { status: 400 }
      );
    }
    updates.role = body.role;
  }

  if (body.display_name !== undefined) {
    const name = String(body.display_name).trim();
    if (name.length < 1 || name.length > 80) {
      return NextResponse.json(
        { error: "Display name must be 1-80 characters" },
        { status: 400 }
      );
    }
    updates.display_name = name;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", targetId)
    .select("id, username, display_name, role")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not update user" },
      { status: 400 }
    );
  }
  if (!data) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, user: data });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const targetId = searchParams.get("id") ?? "";
  if (!targetId) {
    return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_delete_user", {
    p_user_id: targetId,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not delete user" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
