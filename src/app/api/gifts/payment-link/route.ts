import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { normalizeUgPhone } from "@/lib/marzpay";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function cancelPendingLinkTopUps(
  admin: ReturnType<typeof createAdminClient>,
  userId: string
) {
  return admin
    .from("gift_deposits")
    .update({ status: "cancelled", reviewed_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("method", "link")
    .eq("status", "pending");
}

/**
 * Records that the viewer is about to pay a gift package's MarzPay link from
 * a given number, and returns the link to send them to.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!rateLimit(`giftlink:${user.id}`, 5) || !rateLimit(`giftlink-ip:${clientIp(request)}`, 10)) {
    return NextResponse.json(
      { error: "Too many attempts — wait a minute and try again" },
      { status: 429 }
    );
  }

  let body: { package_id?: string; phone?: string };
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
  const { data: pack } = await admin
    .from("gift_topup_packages")
    .select("id, amount, payment_link")
    .eq("id", String(body.package_id ?? ""))
    .maybeSingle();
  if (!pack?.payment_link) {
    return NextResponse.json(
      { error: "That top-up isn't available any more — reload the page." },
      { status: 400 }
    );
  }

  // Replace an earlier link top-up the viewer never paid.
  await cancelPendingLinkTopUps(admin, user.id);

  const { error } = await admin.from("gift_deposits").insert({
    user_id: user.id,
    amount: pack.amount,
    paid_from: phone,
    reference: `LINK-${phone.slice(-9)}-${Date.now().toString(36).toUpperCase()}`,
    method: "link",
    status: "pending",
  });

  if (error) {
    const duplicate = error.code === "23505";
    return NextResponse.json(
      {
        error: duplicate
          ? "You already have a top-up awaiting approval."
          : "Could not start the top-up",
      },
      { status: duplicate ? 409 : 500 }
    );
  }

  return NextResponse.json({ url: pack.payment_link });
}

/** Cancels the viewer's unpaid link top-up so they can choose again. */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { error } = await cancelPendingLinkTopUps(createAdminClient(), user.id);
  if (error) {
    return NextResponse.json({ error: "Could not cancel" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
