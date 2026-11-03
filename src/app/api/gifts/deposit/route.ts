import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Tops up gift credit. The money is sent manually to the account the site
// shows and an admin approves the reference before the credit is usable.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let body: { amount?: number; paid_from?: string; reference?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const amount = Number(body.amount);
  const paidFrom = (body.paid_from ?? "").trim();
  const reference = (body.reference ?? "").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
  }

  if (amount > 10000) {
    return NextResponse.json(
      { error: "Top-ups are limited to 10000 per request" },
      { status: 400 }
    );
  }

  if (!paidFrom) {
    return NextResponse.json(
      { error: "The number you paid from is required" },
      { status: 400 }
    );
  }

  if (!reference) {
    return NextResponse.json(
      { error: "The transaction reference is required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("gift_deposits").insert({
    user_id: user.id,
    amount,
    paid_from: paidFrom.slice(0, 60),
    reference: reference.slice(0, 120),
    note: (body.note ?? "").trim().slice(0, 300) || null,
  });

  if (error) {
    console.warn(`[gifts/deposit] failed: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
