import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { normalizeUgPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { MIN_WITHDRAWAL, PAYOUT_METHODS, type PayoutMethod } from "@/lib/wallet";

// Asks to withdraw money from the creator wallet. The amount is held right
// away and refunded if an admin rejects the request. The database enforces
// every rule (request_withdrawal); these checks only give quicker messages.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let body: { amount?: unknown; method?: unknown; account?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const amount = Number(body.amount);
  const method = String(body.method ?? "") as PayoutMethod;
  const rawAccount = String(body.account ?? "").trim();

  if (!Number.isInteger(amount) || amount < MIN_WITHDRAWAL) {
    return NextResponse.json(
      { error: `Enter a whole amount of at least UGX ${MIN_WITHDRAWAL.toLocaleString()}` },
      { status: 400 }
    );
  }
  if (!PAYOUT_METHODS.some((m) => m.value === method)) {
    return NextResponse.json({ error: "Choose how you want to be paid" }, { status: 400 });
  }

  const account = method === "bank" ? rawAccount : normalizeUgPhone(rawAccount);
  if (!account) {
    return NextResponse.json(
      {
        error:
          method === "bank"
            ? "Enter your bank name, account name and account number"
            : "Enter a valid MTN or Airtel Uganda number, e.g. 0772123456",
      },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_withdrawal", {
    p_amount: amount,
    p_method: method,
    p_account: account,
  });

  if (error) {
    console.warn(`[wallet/withdraw] failed: ${error.message}`);
    return NextResponse.json(
      {
        // Messages raised by request_withdrawal are written for the creator.
        error:
          error.code === "P0001"
            ? error.message
            : "Could not request the withdrawal. Try again.",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, id: data });
}
