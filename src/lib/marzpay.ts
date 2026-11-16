import { createHmac, timingSafeEqual } from "node:crypto";

// MarzPay Collect Money API: https://wallet.wearemarz.com/documentation/collections
const API_BASE = "https://wallet.wearemarz.com/api/v1";

export function isMarzPayConfigured(): boolean {
  return Boolean(process.env.MARZPAY_API_KEY && process.env.MARZPAY_API_SECRET);
}

function authHeader(): string {
  const key = process.env.MARZPAY_API_KEY;
  const secret = process.env.MARZPAY_API_SECRET;
  if (!key || !secret) throw new Error("MarzPay is not configured");
  return `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;
}

async function marzFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (body as { message?: string } | null)?.message ?? `HTTP ${response.status}`;
    throw new Error(`MarzPay ${path}: ${message}`);
  }
  return body;
}

/** Turns 0772123456, 256772123456 or +256 772 123 456 into +256772123456. */
export function normalizeUgPhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  let local: string;
  if (digits.startsWith("256") && digits.length === 12) local = digits.slice(3);
  else if (digits.startsWith("0") && digits.length === 10) local = digits.slice(1);
  else if (digits.length === 9) local = digits;
  else return null;
  return /^7\d{8}$/.test(local) ? `+256${local}` : null;
}

export interface CollectionResult {
  /** MarzPay's transaction uuid, used to look the collection up again. */
  uuid: string | null;
  status: string | null;
}

/** Sends a mobile money payment prompt to the customer's phone. */
export async function collectMoney(input: {
  amount: number;
  phone: string;
  reference: string;
  description: string;
  callbackUrl: string | null;
}): Promise<CollectionResult> {
  const body = (await marzFetch("/collect-money", {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      phone_number: input.phone,
      reference: input.reference,
      country: "UG",
      description: input.description.slice(0, 255),
      ...(input.callbackUrl ? { callback_url: input.callbackUrl } : {}),
    }),
  })) as { data?: { transaction?: { uuid?: string; status?: string } } } | null;

  const transaction = body?.data?.transaction;
  return { uuid: transaction?.uuid ?? null, status: transaction?.status ?? null };
}

export type CollectionOutcome = "completed" | "failed" | "processing";

export interface CollectionStatus {
  outcome: CollectionOutcome;
  reference: string | null;
  /** Amount in UGX, when MarzPay reports it in a shape we recognise. */
  amount: number | null;
  providerTransactionId: string | null;
}

const COMPLETED = new Set(["completed", "successful", "success", "sandbox"]);
const FAILED = new Set(["failed", "cancelled", "canceled", "rejected", "expired"]);

function readAmount(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  if (value && typeof value === "object" && "raw" in value) {
    return readAmount((value as { raw: unknown }).raw);
  }
  return null;
}

/**
 * Reads a collection's state from a MarzPay payload: the GET response's
 * `data` or a callback body. Both carry `transaction` and `collection`.
 */
export function parseCollection(payload: unknown): CollectionStatus {
  const p = (payload ?? {}) as {
    transaction?: { status?: string; reference?: string; amount?: unknown };
    collection?: { provider_transaction_id?: string; amount?: unknown };
  };
  const status = String(p.transaction?.status ?? "").toLowerCase();
  return {
    outcome: COMPLETED.has(status)
      ? "completed"
      : FAILED.has(status)
        ? "failed"
        : "processing",
    reference: p.transaction?.reference ?? null,
    amount: readAmount(p.transaction?.amount) ?? readAmount(p.collection?.amount),
    providerTransactionId: p.collection?.provider_transaction_id ?? null,
  };
}

/** Asks MarzPay for the current state of a collection: the source of truth. */
export async function getCollection(uuid: string): Promise<CollectionStatus> {
  const body = (await marzFetch(`/collect-money/${encodeURIComponent(uuid)}`)) as {
    data?: unknown;
  } | null;
  return parseCollection(body?.data);
}

/**
 * Checks the optional webhook signature (Business Settings → Webhooks &
 * Security → "Sign outgoing webhooks"). Header: `t=<unix>,v1=<hex>` over
 * `<unix>.<raw body>`. With no secret configured every callback passes here,
 * which is safe because callbacks are re-checked with getCollection().
 */
export function verifyMarzPaySignature(rawBody: Buffer, header: string | null): boolean {
  const secret = process.env.MARZPAY_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!header) return false;

  const parts = Object.fromEntries(
    header.split(",").map((part) => part.trim().split("=", 2) as [string, string])
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(rawBody)
    .digest();
  const received = Buffer.from(signature, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
