import { createHmac, timingSafeEqual } from "node:crypto";
import { fetch as undiciFetch, ProxyAgent } from "undici";

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

/**
 * MarzPay only accepts API calls from whitelisted IPs, and Vercel has no
 * fixed outgoing IP. MARZPAY_PROXY_URL (http://user:pass@host:port) routes
 * MarzPay calls, and only those, through a proxy with a static IP.
 */
let proxyAgent: ProxyAgent | null | undefined;
function marzDispatcher(): ProxyAgent | null {
  if (proxyAgent === undefined) {
    const url = process.env.MARZPAY_PROXY_URL;
    proxyAgent = url ? new ProxyAgent(url) : null;
  }
  return proxyAgent;
}

/** A request MarzPay answered with an error, or could not be reached for. */
export class MarzPayError extends Error {
  constructor(
    message: string,
    /** HTTP status; 0 when MarzPay could not be reached. */
    readonly status: number,
    readonly code: string | null = null,
    /** Field validation messages, e.g. { phone_number: ["..."] }. */
    readonly fieldErrors: Record<string, string[]> = {}
  ) {
    super(message);
    this.name = "MarzPayError";
  }

  /** Every message MarzPay gave, in one line. */
  get detail(): string {
    const fields = Object.values(this.fieldErrors).flat();
    return [this.message, ...fields].filter(Boolean).join(" ");
  }
}

async function marzFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  let response: Response;
  try {
    const dispatcher = marzDispatcher();
    const request = {
      method: init.method ?? "GET",
      body: init.body as string | undefined,
      headers: {
        Authorization: authHeader(),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(20_000),
    };
    response = dispatcher
      ? ((await undiciFetch(`${API_BASE}${path}`, {
          ...request,
          dispatcher,
        })) as unknown as Response)
      : await fetch(`${API_BASE}${path}`, { ...request, cache: "no-store" });
  } catch (error) {
    throw new MarzPayError(`Could not reach MarzPay (${String(error)})`, 0);
  }

  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Not JSON, e.g. a firewall or gateway page.
  }

  if (!response.ok) {
    const envelope = (body ?? {}) as {
      message?: string;
      error_code?: string;
      errors?: Record<string, string[] | string>;
    };
    const fieldErrors = Object.fromEntries(
      Object.entries(envelope.errors ?? {}).map(([field, messages]) => [
        field,
        Array.isArray(messages) ? messages.map(String) : [String(messages)],
      ])
    );
    console.error(
      `[marzpay] ${init.method ?? "GET"} ${path} -> HTTP ${response.status}: ${text.slice(0, 500)}`
    );
    throw new MarzPayError(
      envelope.message ?? `MarzPay answered HTTP ${response.status}`,
      response.status,
      envelope.error_code ?? null,
      fieldErrors
    );
  }
  return body;
}

export { normalizeUgPhone } from "./phone";

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
