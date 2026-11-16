import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Admin manages gift top-up packages: an amount and its MarzPay payment link.

async function requireAdmin() {
  const user = await getCurrentUser();
  return user?.role === "admin";
}

function readPackage(body: { amount?: unknown; payment_link?: unknown }) {
  const amount = Number(body.amount);
  const link = String(body.payment_link ?? "").trim();
  if (!Number.isFinite(amount) || amount < 500) {
    return { error: "The amount must be at least UGX 500" };
  }
  if (link && !/^https:\/\/\S+$/.test(link)) {
    return { error: "Paste the full link, starting with https://" };
  }
  return { amount: Math.round(amount), payment_link: link || null };
}

async function parse(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function failure(message: string, code?: string) {
  return NextResponse.json(
    { error: code === "23505" ? "There is already a package with that amount" : message },
    { status: 400 }
  );
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  const body = await parse(request);
  const pack = body && readPackage(body);
  if (!pack || "error" in pack) return failure(pack?.error ?? "Invalid request body");

  const supabase = await createClient();
  const { error } = await supabase
    .from("gift_topup_packages")
    .insert({ ...pack, sort_order: pack.amount });
  if (error) return failure(error.message, error.code);
  return NextResponse.json({ success: true });
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  const body = await parse(request);
  const pack = body && readPackage(body);
  if (!body || !pack || "error" in pack) return failure(pack?.error ?? "Invalid request body");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gift_topup_packages")
    .update({ ...pack, sort_order: pack.amount })
    .eq("id", String(body.id ?? ""))
    .select("id");
  if (error) return failure(error.message, error.code);
  if (!data?.length) return failure("Package not found");
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  const body = await parse(request);
  const supabase = await createClient();
  const { error } = await supabase
    .from("gift_topup_packages")
    .delete()
    .eq("id", String(body?.id ?? ""));
  if (error) return failure(error.message);
  return NextResponse.json({ success: true });
}
