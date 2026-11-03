import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Asks to withdraw money from the creator wallet. The amount is held right
// away and refunded if an admin rejects the request.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let body: { amount?: number; method?: string; account?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const amount = Number(body.amount);
  const method = (body.method ?? "").trim();
  const account = (body.account ?? "").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
  }

  if (!account) {
    return NextResponse.json({ error: "A payout account is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_withdrawal", {
    p_amount: amount,
    p_method: method || null,
    p_account: account,
  });

  if (error) {
    console.warn(`[wallet/withdraw] failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, id: data });
}
