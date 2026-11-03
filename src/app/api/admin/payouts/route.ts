import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Splits the monthly pool between the creators who collected the views.
// Running it twice for the same period pays nobody twice.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  let body: { period?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const period = (body.period ?? "").trim();
  if (!/^[0-9]{4}-[0-9]{2}$/.test(period)) {
    return NextResponse.json(
      { error: "Period must look like 2026-10" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("run_monthly_payouts", {
    p_period: period,
  });

  if (error) {
    console.warn(`[admin/payouts] failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, paid: data ?? [] });
}
