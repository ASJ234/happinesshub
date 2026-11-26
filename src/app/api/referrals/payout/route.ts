import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { normalizeUgPhone } from "@/lib/phone";
import { REFERRAL_PAYOUT_METHODS, type ReferralPayoutMethod } from "@/lib/referrals";
import { createClient } from "@/lib/supabase/server";

// A creator asks to be paid for every full block of 100 paid referrals.
// The referrals are held until an admin sends the money to the number given.
// request_referral_payout() enforces every rule; these checks only give
// quicker messages.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (user.role !== "creator") {
    return NextResponse.json(
      { error: "Only creators can withdraw referrals" },
      { status: 403 }
    );
  }

  let body: { method?: unknown; phone?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const method = String(body.method ?? "") as ReferralPayoutMethod;
  if (!REFERRAL_PAYOUT_METHODS.some((m) => m.value === method)) {
    return NextResponse.json({ error: "Choose MTN or Airtel" }, { status: 400 });
  }

  const phone = normalizeUgPhone(String(body.phone ?? ""));
  if (!phone) {
    return NextResponse.json(
      { error: "Enter a valid MTN or Airtel Uganda number, e.g. 0772123456" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_referral_payout", {
    p_method: method,
    p_account: phone,
  });

  if (error) {
    console.warn(`[referrals/payout] failed: ${error.message}`);
    return NextResponse.json(
      {
        // Messages raised by request_referral_payout are written for the creator.
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
