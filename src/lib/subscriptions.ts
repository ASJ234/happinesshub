export interface PaymentSettings {
  id: boolean;
  account_name: string;
  phone_number: string;
  updated_at: string;
}

export interface SubscriptionRecord {
  id: string;
  amount: number;
  plan_id: string;
  paid_from: string;
  reference: string;
  note: string | null;
  status: "pending" | "active" | "rejected";
  expires_at: string | null;
  created_at: string;
}

export type SubscriptionState =
  | "active"
  | "pending"
  | "rejected"
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
  return "rejected";
}
