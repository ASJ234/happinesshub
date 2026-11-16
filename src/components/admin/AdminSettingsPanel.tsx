"use client";

import { LiveDaysPicker } from "./LiveDaysPicker";
import { DEFAULT_LIVE_WEEKDAYS } from "@/lib/live";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, MessageCircle, Save } from "lucide-react";
import { inputClass } from "@/components/ui/styles";
import { money } from "@/lib/wallet";

interface AdminSettingsPanelProps {
  settings: {
    site_name: string;
    support_whatsapp: string;
    support_message: string;
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



export function AdminSettingsPanel({ settings, gifts }: AdminSettingsPanelProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [siteName, setSiteName] = useState(settings.site_name);
  const [whatsapp, setWhatsapp] = useState(settings.support_whatsapp);
  const [message, setMessage] = useState(settings.support_message);
  const [pool, setPool] = useState(String(settings.monthly_pool));
  const [catalogue, setCatalogue] = useState(gifts);

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
        monthly_pool: Number(pool),
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
    setNotice(`${gift.name} now costs ${money(price)}`);
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
            The monthly pool is split between creators by views. Each creator
            chooses where their own withdrawals are paid.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-sm text-muted block mb-1.5">Monthly pool (UGX)</label>
            <input
              type="number"
              min="0"
              step="1000"
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
            Creators can only go live on the days you tick. Changes save as
            soon as you tap a day.
          </p>
        </div>

        <LiveDaysPicker
          initialDays={settings.live_allowed_weekdays ?? DEFAULT_LIVE_WEEKDAYS}
        />

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
        <span className="text-sm text-muted">UGX</span>
        <input
          type="number"
          min="100"
          step="100"
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
