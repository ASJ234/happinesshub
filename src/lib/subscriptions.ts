export interface SubscriptionRecord {
  id: string;
  amount: number;
  plan_id: string;
  paid_from: string;
  reference: string;
  note: string | null;
  status: "pending" | "active" | "rejected" | "failed" | "revoked";
  method: "manual" | "marzpay" | "link";
  expires_at: string | null;
  created_at: string;
}

export type SubscriptionState =
  | "active"
  | "pending"
  | "rejected"
  | "failed"
  | "revoked"
  | "expired"
  | "none";

/** Where the viewer stands, from their latest subscription request. */
export function subscriptionState(
  latest: Pick<SubscriptionRecord, "status" | "expires_at"> | null
): SubscriptionState {
  if (!latest?.status) return "none";
  if (latest.status === "pending") return "pending";
  if (latest.status === "active") {
    const expiresAt = latest.expires_at ? new Date(latest.expires_at) : null;
    return expiresAt === null || expiresAt.getTime() > Date.now()
      ? "active"
      : "expired";
  }
  if (latest.status === "failed") return "failed";
  if (latest.status === "revoked") return "revoked";
  return "rejected";
}

/** A MarzPay prompt the customer has not answered by now counts as abandoned. */
export const MARZPAY_STALE_MS = 3 * 60_000;
