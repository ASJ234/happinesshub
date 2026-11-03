import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Updates site settings. Only the columns that exist are safe to touch.
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  let body: {
    site_name?: string;
    support_whatsapp?: string;
    support_message?: string;
    payout_method?: string;
    payout_account?: string;
    monthly_pool?: number;
    live_allowed_weekdays?: number[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.site_name === "string") {
    update.site_name = body.site_name.trim().slice(0, 80);
  }
  if (typeof body.support_whatsapp === "string") {
    update.support_whatsapp = body.support_whatsapp.trim().slice(0, 40);
  }
  if (typeof body.support_message === "string") {
    update.support_message = body.support_message.trim().slice(0, 200);
  }
  if (typeof body.payout_method === "string") {
    update.payout_method = body.payout_method.trim().slice(0, 20);
  }
  if (typeof body.payout_account === "string") {
    update.payout_account = body.payout_account.trim().slice(0, 80);
  }
  if (typeof body.monthly_pool === "number" && Number.isFinite(body.monthly_pool)) {
    update.monthly_pool = Math.max(0, body.monthly_pool);
  }
  if (Array.isArray(body.live_allowed_weekdays)) {
    update.live_allowed_weekdays = body.live_allowed_weekdays
      .filter((day) => Number.isInteger(day) && day >= 1 && day <= 7)
      .map((day) => Math.trunc(day));
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("app_settings")
    .update(update)
    .eq("id", true);

  if (error) {
    console.warn(`[admin/settings] update failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
