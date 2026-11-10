"use client";

import { useState } from "react";
import { Banknote, Copy, Phone, UserRound } from "lucide-react";
import type { PaymentSettings } from "@/lib/subscriptions";
import { formatUgx, type SubscriptionPlan } from "@/lib/videos";

interface PaymentDetailsProps {
  settings: PaymentSettings;
  plan: SubscriptionPlan | null;
}

/** The account to deposit to, with a copy button for the number. */
export function PaymentDetails({ settings, plan }: PaymentDetailsProps) {
  const [copied, setCopied] = useState(false);

  function copyNumber() {
    navigator.clipboard?.writeText(settings.phone_number).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <Banknote size={18} className="text-primary" />
        <h2 className="font-semibold">How to pay</h2>
      </div>
      <p className="text-sm text-muted mb-5">
        Deposit{" "}
        <span className="text-foreground font-medium">
          {plan ? formatUgx(plan.amount) : "—"}
        </span>{" "}
        for the{" "}
        <span className="text-foreground font-medium">
          {plan?.name ?? "selected plan"}
        </span>{" "}
        to the account below, then submit your transaction reference.
      </p>

      <div className="space-y-3">
        <div className="bg-surface-elevated border border-border rounded-lg p-4">
          <div className="flex items-center gap-2">
            <UserRound size={16} className="text-muted shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] text-muted uppercase tracking-wide">
                Account name
              </p>
              <p className="text-sm font-medium truncate">{settings.account_name}</p>
            </div>
          </div>
        </div>

        <div className="bg-surface-elevated border border-border rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Phone size={16} className="text-muted shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] text-muted uppercase tracking-wide">
                  Pay to this number
                </p>
                <p className="text-lg font-bold text-primary truncate">
                  {settings.phone_number}
                </p>
              </div>
            </div>
            <button
              onClick={copyNumber}
              className="shrink-0 flex items-center gap-1 text-xs text-muted hover:text-foreground border border-border rounded-lg px-2.5 py-1.5 transition-colors"
            >
              <Copy size={13} />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
