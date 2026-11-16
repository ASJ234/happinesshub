"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertCircle, X } from "lucide-react";
import {
  AGE_COOKIE,
  AGE_COOKIE_MAX_AGE,
  AGE_GATE_EXEMPT_PATHS,
  UNDER_AGE_URL,
} from "@/lib/age-gate";

function leaveSite() {
  window.location.replace(UNDER_AGE_URL);
}

/** Covers the site until the visitor confirms they are 18 or older. */
export function AgeGate() {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const checkboxId = useId();
  const exempt = AGE_GATE_EXEMPT_PATHS.includes(pathname);
  const visible = open && !exempt;

  useEffect(() => {
    if (!visible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [visible]);

  function enter() {
    if (!confirmed) return;
    document.cookie = `${AGE_COOKIE}=1; Max-Age=${AGE_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
    setOpen(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="age-gate-title"
        aria-describedby="age-gate-description"
        className="relative w-full max-w-md bg-surface border border-border rounded-2xl px-6 py-8 sm:px-8 text-center shadow-2xl"
      >
        <button
          type="button"
          onClick={leaveSite}
          aria-label="Leave the site"
          className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors"
        >
          <X size={20} />
        </button>

        <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-accent-red/15 flex items-center justify-center">
          <AlertCircle size={28} className="text-accent-red" />
        </div>

        <h2 id="age-gate-title" className="text-2xl font-bold mb-3">
          Age Verification Required
        </h2>
        <p id="age-gate-description" className="text-sm text-muted leading-relaxed">
          You must be 18 years or older to access this website. This website
          contains adult content and is intended for adults only.
        </p>

        <div className="mt-6 text-left">
          <label htmlFor={checkboxId} className="flex items-start gap-3 cursor-pointer">
            <input
              id={checkboxId}
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              autoFocus
              className="mt-0.5 w-5 h-5 shrink-0 rounded accent-accent-red cursor-pointer"
            />
            <span className="text-sm">I confirm that I am 18 years of age or older.</span>
          </label>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 pl-8 text-sm">
            <Link href="/terms" target="_blank" className="text-accent-red hover:underline">
              Terms of Service
            </Link>
            <Link href="/privacy" target="_blank" className="text-accent-red hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>

        <div className="mt-7 space-y-3">
          <button
            type="button"
            onClick={enter}
            disabled={!confirmed}
            className="w-full gradient-brand text-white font-semibold py-3 rounded-full transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Enter Site
          </button>
          <button
            type="button"
            onClick={leaveSite}
            className="w-full border border-border hover:bg-surface-elevated font-semibold py-3 rounded-full transition-colors"
          >
            I&apos;m Under 18
          </button>
        </div>
      </div>
    </div>
  );
}
