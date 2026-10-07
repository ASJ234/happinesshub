"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import type { PaymentSettings } from "@/components/subscription/SubscriptionPanel";

const inputClass =
  "w-full bg-surface-elevated border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

interface PaymentSettingsFormProps {
  settings: PaymentSettings | null;
}

export function PaymentSettingsForm({ settings }: PaymentSettingsFormProps) {
  const router = useRouter();
  const [accountName, setAccountName] = useState(settings?.account_name ?? "");
  const [phoneNumber, setPhoneNumber] = useState(settings?.phone_number ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  async function save() {
    setSaving(true);
    setMessage(null);

    const response = await fetch("/api/admin/payment-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account_name: accountName,
        phone_number: phoneNumber,
      }),
    });

    const body = await response.json().catch(() => null);
    setSaving(false);

    if (!response.ok) {
      setMessage({ ok: false, text: body?.error ?? "Could not save" });
      return;
    }

    setMessage({ ok: true, text: "Payment details saved" });
    router.refresh();
  }

  return (
    <div className="p-4 space-y-4">
      <p className="text-sm text-muted">
        Shown to customers on the Subscription page. Plan prices are managed
        in the <code className="text-xs">subscription_plans</code> table.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-sm text-muted block mb-1.5">Account name</label>
          <input
            type="text"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-sm text-muted block mb-1.5">
            Deposit number
          </label>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-60"
        >
          <Save size={15} />
          {saving ? "Saving..." : "Save payment details"}
        </button>
        {message && (
          <span
            className={`text-xs ${message.ok ? "text-green-400" : "text-red-400"}`}
          >
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}
