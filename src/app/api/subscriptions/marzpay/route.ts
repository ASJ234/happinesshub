import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  collectMoney,
  isMarzPayConfigured,
  MarzPayError,
  normalizeUgPhone,
} from "@/lib/marzpay";
import {
  MARZPAY_ROW_COLUMNS,
  syncMarzPaySubscription,
  type MarzPaySubscriptionRow,
} from "@/lib/marzpay-sync";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { MARZPAY_STALE_MS } from "@/lib/subscriptions";

export const runtime = "nodejs";

function callbackUrl(request: Request): string | null {
  const url =
    process.env.MARZPAY_CALLBACK_URL ??
    new URL("/api/webhooks/marzpay", request.url).toString();
  // MarzPay cannot reach localhost, and only https callbacks are useful.
  return url.startsWith("https://") ? url : null;
}

async function latestPending(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await admin
    .from("subscriptions")
    .select(`${MARZPAY_ROW_COLUMNS}, method, created_at`)
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();
  return data as (MarzPaySubscriptionRow & { method: string; created_at: string }) | null;
}

/**
 * What to tell the subscriber when MarzPay refuses a charge: MarzPay's own
 * reason (it never contains secrets), plus a setup hint for admins.
 */
function collectErrorMessage(error: unknown, isAdmin: boolean): string {
  if (!(error instanceof MarzPayError)) {
    return "MarzPay could not send the payment prompt. Try again in a moment.";
  }
  if (error.status === 422 || error.status === 400) {
    return `MarzPay: ${error.detail}`;
  }

  const hint = !isAdmin
    ? ""
    : error.status === 401
      ? " Check MARZPAY_API_KEY and MARZPAY_API_SECRET (live keys, no spaces)."
      : error.status === 403
        ? " The MarzPay account may lack collection permission, need IP whitelisting, or be frozen."
        : error.status === 0
          ? " The server could not reach wallet.wearemarz.com."
          : "";
  return `Payment could not start — MarzPay said: ${error.detail} (HTTP ${error.status}).${hint}`;
}

/** Sends a MarzPay payment prompt for the chosen plan to the subscriber's phone. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!isMarzPayConfigured()) {
    return NextResponse.json(
      { error: "Mobile money payments are not set up yet" },
      { status: 503 }
    );
  }
  if (!rateLimit(`marzpay:${user.id}`, 5) || !rateLimit(`marzpay-ip:${clientIp(request)}`, 10)) {
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
    .select("id, name, amount")
    .eq("id", String(body.plan_id ?? ""))
    .maybeSingle();
  if (!plan) {
    return NextResponse.json(
      { error: "Subscription plans changed — reload the page and pick again." },
      { status: 400 }
    );
  }

  // Clear the way: settle or abandon an earlier unanswered prompt.
  const pending = await latestPending(admin, user.id);
  if (pending) {
    if (pending.method !== "marzpay") {
      return NextResponse.json(
        { error: "You already have a deposit awaiting admin approval." },
        { status: 409 }
      );
    }
    const outcome = await syncMarzPaySubscription(admin, pending).catch(() => "unknown");
    if (outcome === "completed") {
      return NextResponse.json({ status: "active" });
    }
    const age = Date.now() - new Date(pending.created_at).getTime();
    if (outcome !== "failed") {
      if (age < MARZPAY_STALE_MS) {
        return NextResponse.json(
          { error: "A payment prompt is already on its way — check your phone." },
          { status: 409 }
        );
      }
      await admin
        .from("subscriptions")
        .update({ status: "failed", reviewed_at: new Date().toISOString() })
        .eq("id", pending.id)
        .eq("status", "pending");
    }
  }

  const reference = randomUUID();
  const { data: row, error: insertError } = await admin
    .from("subscriptions")
    .insert({
      user_id: user.id,
      plan_id: plan.id,
      amount: plan.amount, // the trigger overwrites this from the plan anyway
      paid_from: phone,
      reference,
      method: "marzpay",
      status: "pending",
    })
    .select("id, amount")
    .single();

  if (insertError || !row) {
    const duplicate = insertError?.code === "23505";
    return NextResponse.json(
      {
        error: duplicate
          ? "A payment prompt is already on its way — check your phone."
          : "Could not start the payment",
      },
      { status: duplicate ? 409 : 500 }
    );
  }

  try {
    const result = await collectMoney({
      amount: Number(row.amount),
      phone,
      reference,
      description: `${plan.name} subscription`,
      callbackUrl: callbackUrl(request),
    });
    await admin
      .from("subscriptions")
      .update({ provider_reference: result.uuid })
      .eq("id", row.id);
  } catch (error) {
    console.error(`[marzpay] collect failed: ${String(error)}`);
    await admin
      .from("subscriptions")
      .update({ status: "failed", reviewed_at: new Date().toISOString() })
      .eq("id", row.id);
    return NextResponse.json(
      { error: collectErrorMessage(error, user.role === "admin") },
      { status: 502 }
    );
  }

  return NextResponse.json({ status: "pending" });
}

/** Where the subscriber's MarzPay prompt stands; polled while they approve it. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (!isMarzPayConfigured()) {
    return NextResponse.json({ status: "unknown" });
  }

  const admin = createAdminClient();
  const pending = await latestPending(admin, user.id);
  if (!pending || pending.method !== "marzpay") {
    return NextResponse.json({ status: "none" });
  }

  try {
    const outcome = await syncMarzPaySubscription(admin, pending);
    return NextResponse.json({
      status:
        outcome === "completed" ? "active" : outcome === "failed" ? "failed" : "pending",
    });
  } catch (error) {
    console.warn(`[marzpay] status check failed: ${String(error)}`);
    return NextResponse.json({ status: "pending" });
  }
}
