import { NextResponse } from "next/server";
import { isMarzPayConfigured, verifyMarzPaySignature } from "@/lib/marzpay";
import {
  MARZPAY_ROW_COLUMNS,
  syncMarzPaySubscription,
  type MarzPaySubscriptionRow,
} from "@/lib/marzpay-sync";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface MarzPayCallback {
  event_type?: string;
  transaction?: { uuid?: string; reference?: string };
}

/**
 * MarzPay posts here when a collection completes or fails. The body is only
 * used to find the subscription: its outcome is re-read from MarzPay's API,
 * so a forged callback cannot open a padlock. A 5xx asks MarzPay to retry.
 */
export async function POST(request: Request) {
  if (!isMarzPayConfigured()) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const rawBody = Buffer.from(await request.arrayBuffer());
  if (!verifyMarzPaySignature(rawBody, request.headers.get("x-marzpay-signature"))) {
    console.warn("[marzpay] webhook rejected: invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: MarzPayCallback;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const reference = event.transaction?.reference;
  if (!reference) return NextResponse.json({ received: true });

  const admin = createAdminClient();
  const { data: row } = await admin
    .from("subscriptions")
    .select(MARZPAY_ROW_COLUMNS)
    .eq("method", "marzpay")
    .eq("reference", reference)
    .maybeSingle();
  if (!row) return NextResponse.json({ received: true });

  try {
    await syncMarzPaySubscription(
      admin,
      row as MarzPaySubscriptionRow,
      event.transaction?.uuid
    );
  } catch (error) {
    console.error(`[marzpay] webhook handling failed: ${String(error)}`);
    return NextResponse.json({ error: "Could not process the webhook" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
