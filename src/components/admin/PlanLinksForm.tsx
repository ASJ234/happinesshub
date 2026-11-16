"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { inputClass, primaryButtonClass } from "@/components/ui/styles";
import { formatUgx, type SubscriptionPlan } from "@/lib/videos";

interface PlanLinksFormProps {
  plans: SubscriptionPlan[];
  /** Absolute URLs to paste into each MarzPay link's settings. */
  redirectUrl: string;
  callbackUrl: string;
}

function PlanLinkRow({ plan }: { plan: SubscriptionPlan }) {
  const router = useRouter();
  const [link, setLink] = useState(plan.payment_link ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const changed = link.trim() !== (plan.payment_link ?? "");

  async function save() {
    setSaving(true);
    setMessage(null);
    const response = await fetch("/api/admin/plans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: plan.id, payment_link: link }),
    }).catch(() => null);
    const body = await response?.json().catch(() => null);
    setSaving(false);
    if (!response?.ok) {
      return setMessage({ ok: false, text: body?.error ?? "Could not save" });
    }
    setMessage({ ok: true, text: "Saved" });
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[9rem_1fr_auto] gap-2 sm:items-center">
      <p className="text-sm">
        <span className="font-medium">{plan.name}</span>{" "}
        <span className="text-muted">{formatUgx(plan.amount)}</span>
      </p>
      <input
        type="url"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="https://wallet.wearemarz.com/pay/..."
        className={inputClass}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving || !changed}
          className={primaryButtonClass}
        >
          <Save size={14} />
          {saving ? "Saving..." : "Save"}
        </button>
        {message && (
          <span className={`text-xs ${message.ok ? "text-green-400" : "text-red-400"}`}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}

/** The MarzPay payment link each subscription plan sends subscribers to. */
export function PlanLinksForm({ plans, redirectUrl, callbackUrl }: PlanLinksFormProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="text-sm text-muted space-y-1">
        <p>
          In MarzPay, create one payment link per plan with a <b>fixed amount</b>{" "}
          equal to the plan price, then paste it here. On each link set:
        </p>
        <p>
          Redirect URL: <code className="text-xs text-foreground break-all">{redirectUrl}</code>
        </p>
        <p>
          Callback URL: <code className="text-xs text-foreground break-all">{callbackUrl}</code>
        </p>
      </div>
      <div className="space-y-3">
        {plans.map((plan) => (
          <PlanLinkRow key={plan.id} plan={plan} />
        ))}
      </div>
    </div>
  );
}
