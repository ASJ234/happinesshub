"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import { inputClass, primaryButtonClass } from "@/components/ui/styles";
import type { GiftTopUpPackage } from "@/lib/gift-topups";

interface GiftPackagesFormProps {
  packages: GiftTopUpPackage[];
  redirectUrl: string;
  callbackUrl: string;
}

type Message = { ok: boolean; text: string } | null;

async function send(method: string, body: object): Promise<string | null> {
  const response = await fetch("/api/admin/gift-packages", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (response?.ok) return null;
  const data = await response?.json().catch(() => null);
  return data?.error ?? "Could not save";
}

/** One package: its amount and MarzPay link. Without `pack` it adds a new one. */
function PackageRow({ pack }: { pack?: GiftTopUpPackage }) {
  const router = useRouter();
  const [amount, setAmount] = useState(pack ? String(pack.amount) : "");
  const [link, setLink] = useState(pack?.payment_link ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const changed = !pack || amount !== String(pack.amount) || link.trim() !== (pack.payment_link ?? "");

  async function save() {
    setBusy(true);
    setMessage(null);
    const error = await send(pack ? "PATCH" : "POST", {
      id: pack?.id,
      amount: Number(amount),
      payment_link: link,
    });
    setBusy(false);
    if (error) return setMessage({ ok: false, text: error });
    setMessage({ ok: true, text: "Saved" });
    if (!pack) {
      setAmount("");
      setLink("");
    }
    router.refresh();
  }

  async function remove() {
    if (!pack || !confirm(`Remove the UGX ${pack.amount.toLocaleString()} top-up?`)) return;
    setBusy(true);
    const error = await send("DELETE", { id: pack.id });
    setBusy(false);
    if (error) return setMessage({ ok: false, text: error });
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[8rem_1fr_auto] gap-2 sm:items-center">
      <input
        type="number"
        min={500}
        step={100}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount (UGX)"
        aria-label="Amount in UGX"
        className={inputClass}
      />
      <input
        type="url"
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="https://wallet.wearemarz.com/pay/..."
        aria-label="MarzPay payment link"
        className={inputClass}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={busy || !changed || !amount}
          className={primaryButtonClass}
        >
          {pack ? <Save size={14} /> : <Plus size={14} />}
          {pack ? "Save" : "Add"}
        </button>
        {pack && (
          <button
            onClick={remove}
            disabled={busy}
            aria-label="Remove top-up"
            className="p-2 text-muted hover:text-red-400 disabled:opacity-50"
          >
            <Trash2 size={15} />
          </button>
        )}
        {message && (
          <span className={`text-xs ${message.ok ? "text-green-400" : "text-red-400"}`}>
            {message.text}
          </span>
        )}
      </div>
    </div>
  );
}

/** The gift-credit top-up amounts and the MarzPay link for each. */
export function GiftPackagesForm({ packages, redirectUrl, callbackUrl }: GiftPackagesFormProps) {
  return (
    <div className="p-4 space-y-4">
      <div className="text-sm text-muted space-y-1">
        <p>
          In MarzPay, create one payment link per amount with a <b>fixed amount</b>,
          then paste it here. Amounts without a link are hidden from users. On each
          link set:
        </p>
        <p>
          Redirect URL: <code className="text-xs text-foreground break-all">{redirectUrl}</code>
        </p>
        <p>
          Callback URL: <code className="text-xs text-foreground break-all">{callbackUrl}</code>
        </p>
      </div>
      <div className="space-y-3">
        {packages.map((pack) => (
          <PackageRow key={`${pack.id}-${pack.amount}-${pack.payment_link}`} pack={pack} />
        ))}
        <PackageRow key={`new-${packages.length}`} />
      </div>
    </div>
  );
}
