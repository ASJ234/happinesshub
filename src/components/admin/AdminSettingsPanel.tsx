"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, MessageCircle, Save } from "lucide-react";

interface AdminSettingsPanelProps {
  settings: {
    site_name: string;
    support_whatsapp: string;
    support_message: string;
    payout_method: string;
    payout_account: string;
    monthly_pool: number;
    live_allowed_weekdays: number[];
  };
  gifts: Array<{
    id: string;
    name: string;
    emoji: string;
    price: number;
    active: boolean;
    sort_order: number;
  }>;
}

const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

const inputClass =
  "w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

export function AdminSettingsPanel({ settings, gifts }: AdminSettingsPanelProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [siteName, setSiteName] = useState(settings.site_name);
  const [whatsapp, setWhatsapp] = useState(settings.support_whatsapp);
  const [message, setMessage] = useState(settings.support_message);
  const [payoutMethod, setPayoutMethod] = useState(settings.payout_method);
  const [payoutAccount, setPayoutAccount] = useState(settings.payout_account);
  const [pool, setPool] = useState(String(settings.monthly_pool));
  const [days, setDays] = useState<number[]>(settings.live_allowed_weekdays ?? [3, 5, 6, 7]);
  const [catalogue, setCatalogue] = useState(gifts);

  function toggleDay(day: number) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  async function save() {
    setBusy(true);
    setError(null);
    setNotice(null);

    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        site_name: siteName,
        support_whatsapp: whatsapp,
        support_message: message,
        payout_method: payoutMethod,
        payout_account: payoutAccount,
        monthly_pool: Number(pool),
        live_allowed_weekdays: days,
      }),
    });

    const body = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setError(body?.error ?? "Could not save the settings");
      return;
    }

    setNotice("Settings saved");
    router.refresh();
  }

  async function saveGift(gift: AdminSettingsPanelProps["gifts"][number], price: number) {
    setBusy(true);
    setError(null);
    setNotice(null);

    const response = await fetch("/api/admin/live-gifts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: gift.id, price }),
    });

    const body = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setError(body?.error ?? "Could not save the gift");
      return;
    }

    setCatalogue((prev) =>
      prev.map((entry) => (entry.id === gift.id ? { ...entry, price } : entry))
    );
    setNotice(`${gift.name} now costs $${price.toFixed(2)}`);
    router.refresh();
  }

  async function toggleGift(gift: AdminSettingsPanelProps["gifts"][number]) {
    setBusy(true);
    setError(null);
    setNotice(null);

    const response = await fetch("/api/admin/live-gifts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: gift.id, active: !gift.active }),
    });

    const body = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setError(body?.error ?? "Could not save the gift");
      return;
    }

    setCatalogue((prev) =>
      prev.map((entry) =>
        entry.id === gift.id ? { ...entry, active: !entry.active } : entry
      )
    );
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-400">{error}</p>}
      {notice && <p className="text-sm text-green-400">{notice}</p>}

      <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="font-semibold">Site</h2>
          <p className="text-xs text-muted mt-0.5">
            The name shown in the browser tab and in messages.
          </p>
        </div>

        <div>
          <label className="text-sm text-muted block mb-1.5">Site name</label>
          <input
            type="text"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            maxLength={80}
            className={inputClass}
          />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="font-semibold flex items-center gap-1.5">
            <MessageCircle size={16} className="text-primary" />
            WhatsApp support
          </h2>
          <p className="text-xs text-muted mt-0.5">
            This number appears on the WhatsApp help button.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted block mb-1.5">WhatsApp number</label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1.5">Default message</label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="font-semibold">Payouts</h2>
          <p className="text-xs text-muted mt-0.5">
            Used by the monthly pool and withdrawal requests.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-muted block mb-1.5">Payout method</label>
            <select
              value={payoutMethod}
              onChange={(e) => setPayoutMethod(e.target.value)}
              className={inputClass}
            >
              <option value="mtn">MTN Mobile Money</option>
              <option value="airtel">Airtel Money</option>
              <option value="bank">Bank transfer</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-muted block mb-1.5">Payout account</label>
            <input
              type="text"
              value={payoutAccount}
              onChange={(e) => setPayoutAccount(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1.5">Monthly pool ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={pool}
              onChange={(e) => setPool(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="font-semibold">Live days</h2>
          <p className="text-xs text-muted mt-0.5">
            Creators can only go live on the days you tick.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day) => (
            <button
              key={day.value}
              onClick={() => toggleDay(day.value)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                days.includes(day.value)
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-surface-elevated text-muted"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="font-semibold flex items-center gap-1.5">
            <Gift size={16} className="text-primary" />
            Gift catalogue
          </h2>
          <p className="text-xs text-muted mt-0.5">
            What viewers can send during a live stream.
          </p>
        </div>

        <div className="space-y-2">
          {catalogue.map((gift) => (
            <GiftRow
              key={gift.id}
              gift={gift}
              disabled={busy}
              onSave={(price) => saveGift(gift, price)}
              onToggle={() => toggleGift(gift)}
            />
          ))}
        </div>
      </div>

      <button
        onClick={save}
        disabled={busy}
        className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
      >
        <Save size={16} />
        {busy ? "Saving..." : "Save settings"}
      </button>
    </div>
  );
}

interface GiftRowProps {
  gift: { id: string; name: string; emoji: string; price: number; active: boolean };
  disabled: boolean;
  onSave: (price: number) => void;
  onToggle: () => void;
}

function GiftRow({ gift, disabled, onSave, onToggle }: GiftRowProps) {
  const [price, setPrice] = useState(String(gift.price));

  return (
    <div className="flex items-center gap-3 border-b border-border last:border-0 py-2">
      <span className="text-xl leading-none w-7 text-center">{gift.emoji}</span>
      <span className="text-sm w-24 truncate">{gift.name}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-muted">$</span>
        <input
          type="number"
          min="0.5"
          step="0.5"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-20 bg-surface-elevated border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      <button
        onClick={() => onSave(Number(price))}
        disabled={disabled || !Number(price)}
        className="text-xs text-primary hover:underline disabled:opacity-50"
      >
        Save
      </button>
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`text-xs font-medium ml-auto disabled:opacity-50 ${
          gift.active ? "text-green-400" : "text-muted"
        }`}
      >
        {gift.active ? "Offered" : "Hidden"}
      </button>
    </div>
  );
}
