import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Admin edits the deposit details shown on the subscription page.
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  const body = await request.json();
  const accountName = String(body.account_name ?? "").trim();
  const phoneNumber = String(body.phone_number ?? "").trim();

  if (!accountName || !phoneNumber) {
    return NextResponse.json(
      { error: "Account name and phone number are required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("payment_settings")
    .update({
      account_name: accountName,
      phone_number: phoneNumber,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  if (error) {
    return NextResponse.json(
      { error: error.message || "Could not update payment settings" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}