import { NextResponse } from "next/server";
import { verifyMarzPaySignature } from "@/lib/marzpay";
import { parseLinkCallback } from "@/lib/payment-links";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Set as the Callback URL on each plan's MarzPay payment link, and with
 * `?for=gift` on each gift top-up package's link. Every call is
 * stored in payment_link_events. A completed payment opens the matching
 * pending request (same phone, amount covered, last hour) automatically, but
 * only when the callback is signed: an unsigned one could be forged, so it is
 * left for an admin to approve.
 */
export async function POST(request: Request) {
  const rawBody = Buffer.from(await request.arrayBuffer());
  const signatureHeader = request.headers.get("x-marzpay-signature");
  const signed =
    Boolean(process.env.MARZPAY_WEBHOOK_SECRET) &&
    verifyMarzPaySignature(rawBody, signatureHeader);

  if (process.env.MARZPAY_WEBHOOK_SECRET && !signed) {
    console.warn("[marzpay-link] callback rejected: invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    // Some gateways post form data; keep it readable for inspection.
    payload = Object.fromEntries(new URLSearchParams(rawBody.toString("utf8")));
  }

  const kind =
    new URL(request.url).searchParams.get("for") === "gift" ? "gift" : "subscription";
  const payment = parseLinkCallback(payload);
  const admin = createAdminClient();

  let matchedId: string | null = null;
  let outcome = "recorded";

  try {
    if (!payment.completed) {
      outcome = "not_completed";
    } else if (!signed) {
      outcome = "unsigned_needs_admin";
    } else if (!payment.phone || payment.amount === null) {
      outcome = "unreadable_needs_admin";
    } else {
      const { data, error } = await admin.rpc(
        kind === "gift" ? "match_gift_link_payment" : "match_link_payment",
        {
          p_phone: payment.phone,
          p_amount: payment.amount,
          p_transaction_id: payment.transactionId,
        }
      );
      if (error) throw error;
      matchedId = (data as string | null) ?? null;
      outcome = matchedId ? "activated" : "no_match_needs_admin";
    }
  } catch (error) {
    console.error(`[marzpay-link] matching failed: ${String(error)}`);
    outcome = "error";
  }

  const { error: logError } = await admin.from("payment_link_events").insert({
    kind,
    signed,
    payload,
    phone: payment.phone,
    amount: payment.amount,
    status: payment.status,
    transaction_id: payment.transactionId,
    subscription_id: kind === "subscription" ? matchedId : null,
    gift_deposit_id: kind === "gift" ? matchedId : null,
    outcome,
  });
  if (logError) console.error(`[marzpay-link] could not log: ${logError.message}`);

  console.info(`[marzpay-link] ${kind} ${outcome}`, JSON.stringify(payload).slice(0, 1000));

  // A 5xx makes MarzPay retry, which only helps if matching itself failed.
  return outcome === "error"
    ? NextResponse.json({ error: "Could not process" }, { status: 500 })
    : NextResponse.json({ received: true });
}
