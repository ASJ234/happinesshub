"use client";

import { useEffect, useState } from "react";
import { Phone, ShoppingBag, X } from "lucide-react";

interface BuyButtonProps {
  productName: string;
  sellerName: string;
  /** Null when the seller has not added a number. */
  phoneNumber: string | null;
}

/**
 * There is no checkout: tapping Buy shows the seller's number and asks the
 * buyer to contact them directly.
 */
export function BuyButton({ productName, sellerName, phoneNumber }: BuyButtonProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-white text-sm font-medium py-2 rounded-lg transition-colors"
      >
        <ShoppingBag size={15} />
        Buy
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="buy-dialog-title"
            className="relative w-full max-w-sm bg-surface border border-border rounded-2xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 p-1.5 text-muted hover:text-foreground rounded-lg"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-full bg-primary/15 text-primary flex items-center justify-center mx-auto mb-3">
              <Phone size={22} />
            </div>
            <h2 id="buy-dialog-title" className="font-semibold">
              Contact the seller
            </h2>
            <p className="text-sm text-muted mt-1">
              To buy <span className="text-foreground">{productName}</span>, contact{" "}
              <span className="text-foreground">{sellerName}</span> directly.
            </p>

            {phoneNumber ? (
              <a
                href={`tel:${phoneNumber}`}
                className="mt-5 block w-full bg-primary hover:bg-primary-hover text-white font-semibold text-lg py-3 rounded-xl transition-colors"
              >
                {phoneNumber}
              </a>
            ) : (
              <p className="mt-5 text-sm text-muted">
                This seller has not added a number yet.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
