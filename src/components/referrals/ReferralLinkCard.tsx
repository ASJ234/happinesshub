"use client";

import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { inputClass, primaryButtonClass } from "@/components/ui/styles";

interface ReferralLinkCardProps {
  link: string;
}

/** The creator's invite link with a copy button. */
export function ReferralLinkCard({ link }: ReferralLinkCardProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <Link2 size={18} className="text-primary" />
        <h2 className="font-semibold">Your invite link</h2>
      </div>
      <p className="text-sm text-muted mb-4">
        Share it. Anyone who signs up through it and pays for a subscription
        counts as a paid referral.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          readOnly
          value={link}
          onFocus={(event) => event.target.select()}
          className={inputClass}
          aria-label="Invite link"
        />
        <button type="button" onClick={copy} className={`${primaryButtonClass} shrink-0`}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </Card>
  );
}
