import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Edits a gift in the catalogue. The RLS policy keeps this to admins.
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  let body: { id?: string; name?: string; emoji?: string; price?: number; active?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const id = (body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "Missing gift id" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (typeof body.name === "string") {
    update.name = body.name.trim().slice(0, 40);
  }
  if (typeof body.emoji === "string") {
    update.emoji = body.emoji.trim().slice(0, 8) || "🎁";
  }
  if (typeof body.price === "number" && Number.isFinite(body.price)) {
    if (body.price <= 0) {
      return NextResponse.json(
        { error: "The price must be more than zero" },
        { status: 400 }
      );
    }
    update.price = Math.round(body.price * 100) / 100;
  }
  if (typeof body.active === "boolean") {
    update.active = body.active;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to change" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("live_gifts")
    .update(update)
    .eq("id", id);

  if (error) {
    console.warn(`[admin/live-gifts] update failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
