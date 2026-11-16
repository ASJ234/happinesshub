import { isMarzPayConfigured, normalizeUgPhone } from "./marzpay";

export type PaymentMode = "api" | "link";

/**
 * The Collect Money API needs a whitelisted IP, so it is only used once a
 * static-IP proxy is set (or MARZPAY_MODE=api on a host with a fixed IP).
 * Otherwise subscribers pay through each plan's MarzPay payment link.
 */
export function paymentMode(): PaymentMode {
  if (!isMarzPayConfigured()) return "link";
  return process.env.MARZPAY_PROXY_URL || process.env.MARZPAY_MODE === "api"
    ? "api"
    : "link";
}

export interface LinkPayment {
  completed: boolean;
  status: string | null;
  phone: string | null;
  amount: number | null;
  transactionId: string | null;
}

const COMPLETED = new Set(["completed", "successful", "success", "paid"]);

/** The first value found under any of `keys`, searching nested objects. */
function find(value: unknown, keys: string[], depth = 0): unknown {
  if (!value || typeof value !== "object" || depth > 4) return undefined;
  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const hit = record[key];
    if (hit !== undefined && hit !== null && hit !== "") return hit;
  }
  for (const child of Object.values(record)) {
    const hit = find(child, keys, depth + 1);
    if (hit !== undefined) return hit;
  }
  return undefined;
}

function toAmount(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  if (value && typeof value === "object" && "raw" in value) {
    return toAmount((value as { raw: unknown }).raw);
  }
  return null;
}

/**
 * Reads a payment-link callback. MarzPay does not document its shape, so this
 * looks for the field names its collection callbacks use, wherever they sit.
 */
export function parseLinkCallback(payload: unknown): LinkPayment {
  const rawStatus = find(payload, ["status", "event_type"]);
  const status = rawStatus === undefined ? null : String(rawStatus).toLowerCase();
  const eventType = String(find(payload, ["event_type"]) ?? "").toLowerCase();
  const phone = find(payload, ["phone_number", "phone", "msisdn", "customer_phone"]);
  const txn = find(payload, ["provider_transaction_id", "uuid", "transaction_id", "id"]);

  return {
    completed:
      (status !== null && COMPLETED.has(status)) || eventType.endsWith(".completed"),
    status,
    phone: phone === undefined ? null : normalizeUgPhone(String(phone)),
    amount: toAmount(find(payload, ["amount", "paid_amount"])),
    transactionId: txn === undefined ? null : String(txn),
  };
}
