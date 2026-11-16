import type { SupabaseClient } from "@supabase/supabase-js";
import { getCollection, type CollectionOutcome } from "./marzpay";

export interface MarzPaySubscriptionRow {
  id: string;
  reference: string;
  amount: number;
  status: string;
  provider_reference: string | null;
}

/**
 * Asks MarzPay where a subscription's charge stands and records the result.
 * Callbacks and the subscriber's status polling both end here, so nothing
 * from the browser or an unsigned callback is ever trusted on its own.
 *
 * `fallbackUuid` is the transaction uuid from a callback, used only when the
 * row has none stored yet; its reference must then match the row's.
 */
export async function syncMarzPaySubscription(
  admin: SupabaseClient,
  row: MarzPaySubscriptionRow,
  fallbackUuid?: string | null
): Promise<CollectionOutcome | "unknown"> {
  if (row.status === "active") return "completed";

  const uuid = row.provider_reference ?? fallbackUuid ?? null;
  if (!uuid) return "unknown";

  const collection = await getCollection(uuid);
  if (collection.reference && collection.reference !== row.reference) {
    console.warn(`[marzpay] reference mismatch for subscription ${row.id}`);
    return "unknown";
  }
  if (!row.provider_reference) {
    await admin
      .from("subscriptions")
      .update({ provider_reference: uuid })
      .eq("id", row.id);
  }
  if (collection.outcome === "processing") return "processing";

  const { data, error } = await admin.rpc("marzpay_settle_subscription", {
    p_reference: row.reference,
    p_completed: collection.outcome === "completed",
    p_amount: collection.amount,
    p_provider_transaction_id: collection.providerTransactionId,
  });
  if (error) throw error;
  if (data === "amount_mismatch") {
    console.warn(`[marzpay] amount mismatch for subscription ${row.id}`);
    return "unknown";
  }
  return collection.outcome;
}

export const MARZPAY_ROW_COLUMNS = "id, reference, amount, status, provider_reference";
