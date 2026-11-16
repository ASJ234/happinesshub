import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Admin sets the MarzPay payment link subscribers are sent to for a plan.
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  let body: { id?: string; payment_link?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const id = String(body.id ?? "");
  const link = String(body.payment_link ?? "").trim();
  if (link && !/^https:\/\/\S+$/.test(link)) {
    return NextResponse.json(
      { error: "Paste the full link, starting with https://" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscription_plans")
    .update({ payment_link: link || null })
    .eq("id", id)
    .select("id");

  if (error || !data?.length) {
    return NextResponse.json(
      { error: error?.message ?? "Plan not found" },
      { status: 400 }
    );
  }
  return NextResponse.json({ success: true });
}
