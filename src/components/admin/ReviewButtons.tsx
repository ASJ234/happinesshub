"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { reviewListing, type ReviewAction } from "@/lib/listing-actions";
import type { VerificationStatus } from "@/lib/listings";

interface ReviewButtonsProps {
  listingId: string;
  status: VerificationStatus;
}

/**
 * Approve or reject any profile, also one that was already approved (to take
 * it down) or rejected (to restore it).
 */
export function ReviewButtons({ listingId, status }: ReviewButtonsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function review(action: ReviewAction) {
    setBusy(true);
    setError(null);
    const problem = await reviewListing(listingId, action);
    setBusy(false);
    if (problem) return setError(problem);
    router.refresh();
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <button
          onClick={() => review("approve")}
          disabled={busy || status === "approved"}
          className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 font-medium disabled:opacity-40"
        >
          <Check size={13} />
          Approve
        </button>
        <button
          onClick={() => review("reject")}
          disabled={busy || status === "rejected"}
          className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-40"
        >
          <X size={13} />
          {status === "approved" ? "Take down" : "Reject"}
        </button>
      </div>
      {error && <p className="text-[11px] text-red-400 max-w-56">{error}</p>}
    </div>
  );
}
