"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { readError } from "@/lib/fetch-error";
import { ItemCard } from "./ItemCard";
import type { ManagedListing } from "@/lib/listings";
import {
  chipButtonClass,
  inputClass,
  primaryButtonClass,
  removeButtonClass,
} from "@/components/ui/styles";

interface ItemManagerProps {
  listingId: string;
  items: ManagedListing["items"];
  /** Wardrobe products (name + price) instead of services. */
  isShop: boolean;
}

const EMPTY_FORM = { title: "", description: "", price: "" };

/** Lists a profile's services or products and adds new ones. */
export function ItemManager({ listingId, items, isShop }: ItemManagerProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const noun = isShop ? "product" : "service";
  const ready = isShop
    ? Boolean(file && form.title.trim() && /^\d[\d,]*$/.test(form.price.trim()))
    : Boolean(file && form.description.trim());

  async function send(request: Promise<Response>, failure: string): Promise<boolean> {
    setBusy(true);
    setError(null);
    const response = await request;
    setBusy(false);
    if (!response.ok) {
      setError(await readError(response, failure));
      return false;
    }
    router.refresh();
    return true;
  }

  async function addItem() {
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    body.append("title", form.title);
    body.append("description", form.description);
    if (isShop) body.append("price", form.price);

    const added = await send(
      fetch(`/api/listings/${listingId}/items`, { method: "POST", body }),
      `Could not add the ${noun}`
    );
    if (added) {
      setFile(null);
      setForm(EMPTY_FORM);
    }
  }

  function removeItem(itemId: string) {
    if (!window.confirm(`Remove this ${noun}?`)) return;
    send(
      fetch(`/api/listings/${listingId}/items?id=${itemId}`, { method: "DELETE" }),
      `Could not remove the ${noun}`
    );
  }

  const set = (key: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm({ ...form, [key]: e.target.value });

  return (
    <div className="border-t border-border pt-5 space-y-4">
      <div>
        <h3 className="text-sm font-medium">{isShop ? "Products" : "Services"}</h3>
        <p className="text-xs text-muted mt-0.5">
          {isShop
            ? "Each product needs a photo, a name and a price in UGX."
            : "Add a photo and a description for each service you offer."}
        </p>
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              compact
              photoUrl={item.photoUrl}
              title={item.title}
              priceUgx={item.price_ugx}
              description={item.description}
              corner={
                <button
                  onClick={() => removeItem(item.id)}
                  disabled={busy}
                  className={removeButtonClass}
                  title={`Remove ${noun}`}
                >
                  <Trash2 size={13} />
                </button>
              }
            />
          ))}
        </div>
      )}

      <div className="bg-surface-elevated/50 border border-dashed border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className={chipButtonClass}
          >
            <ImagePlus size={13} />
            {file ? "Change photo" : "Choose photo"}
          </button>
          <span className="text-xs text-muted truncate">
            {file ? file.name : "No photo chosen"}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={isShop ? "" : "sm:col-span-2"}>
            <label className="text-xs text-muted block mb-1">
              {isShop ? "Product name" : "Service name (optional)"}
            </label>
            <input
              type="text"
              value={form.title}
              onChange={set("title")}
              maxLength={120}
              className={inputClass}
            />
          </div>
          {isShop && (
            <div>
              <label className="text-xs text-muted block mb-1">Price (UGX)</label>
              <input
                type="text"
                inputMode="numeric"
                value={form.price}
                onChange={set("price")}
                placeholder="e.g. 50,000"
                className={inputClass}
              />
            </div>
          )}
          <div className="sm:col-span-2">
            <label className="text-xs text-muted block mb-1">
              {isShop ? "Description (optional)" : "Description"}
            </label>
            <textarea
              value={form.description}
              onChange={set("description")}
              rows={2}
              maxLength={2000}
              className={`${inputClass} resize-y`}
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="button"
          onClick={addItem}
          disabled={busy || !ready}
          className={primaryButtonClass}
        >
          <Plus size={15} />
          {busy ? "Adding..." : `Add ${noun}`}
        </button>
      </div>
    </div>
  );
}
