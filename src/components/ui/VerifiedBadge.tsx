import { BadgeCheck, ShieldAlert } from "lucide-react";
import type { VerificationStatus } from "@/lib/listings";

interface VerifiedBadgeProps {
  status: VerificationStatus;
  className?: string;
}

/**
 * Green "Verified" once an admin has approved the profile, red "Not Verified"
 * while it is still pending or has been rejected.
 */
export function VerifiedBadge({ status, className = "" }: VerifiedBadgeProps) {
  const verified = status === "approved";

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
        verified ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
      } ${className}`}
    >
      {verified ? <BadgeCheck size={13} /> : <ShieldAlert size={13} />}
      {verified ? "Verified" : "Not Verified"}
    </span>
  );
}
