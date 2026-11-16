import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { normalizeUgPhone } from "@/lib/marzpay";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Records that the subscriber is about to pay a plan's MarzPay link from a
 * given number, and returns the link to send them to.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!rateLimit(`paylink:${user.id}`, 5) || !rateLimit(`paylink-ip:${clientIp(request)}`, 10)) {
    return NextResponse.json(
      { error: "Too many attempts — wait a minute and try again" },
      { status: 429 }
    );
  }

  let body: { plan_id?: string; phone?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const phone = normalizeUgPhone(String(body.phone ?? ""));
  if (!phone) {
    return NextResponse.json(
      { error: "Enter an MTN or Airtel Uganda number, e.g. 0772123456" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("subscription_plans")
    .select("id, amount, payment_link")
    .eq("id", String(body.plan_id ?? ""))
    .maybeSingle();
  if (!plan) {
    return NextResponse.json(
      { error: "Subscription plans changed — reload the page and pick again." },
      { status: 400 }
    );
  }
  if (!plan.payment_link) {
    return NextResponse.json(
      { error: "This plan can't be paid online yet. Please contact support." },
      { status: 503 }
    );
  }

  // Replace an earlier link request the subscriber never paid.
  await admin
    .from("subscriptions")
    .update({ status: "failed", reviewed_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("method", "link")
    .eq("status", "pending");

  const { error } = await admin.from("subscriptions").insert({
    user_id: user.id,
    plan_id: plan.id,
    amount: plan.amount, // the trigger sets this from the plan anyway
    paid_from: phone,
    reference: `LINK-${phone.slice(-9)}-${Date.now().toString(36).toUpperCase()}`,
    method: "link",
    status: "pending",
  });

  if (error) {
    return NextResponse.json(
      {
        error:
          error.code === "23505"
            ? "You already have a payment awaiting approval."
            : "Could not start the payment",
      },
      { status: error.code === "23505" ? 409 : 500 }
    );
  }

  return NextResponse.json({ url: plan.payment_link });
}

/** Cancels the subscriber's unpaid link request so they can start again. */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .update({ status: "failed", reviewed_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("method", "link")
    .eq("status", "pending");

  if (error) {
    return NextResponse.json({ error: "Could not cancel" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
