"use client";

import { createPortal } from "react-dom";
import { AlertCircle } from "lucide-react";
import { AuthStatusMessage } from "./AuthStatusMessage";

interface SigningOutProps {
  /** Set when signing out failed; shows the message with Try again / Cancel. */
  error: string | null;
  onRetry: () => void;
  onCancel: () => void;
}

/**
 * Covers the whole screen from the moment Sign out is pressed until the login
 * page replaces the dashboard, so the user knows it is happening.
 */
export function SigningOut({ error, onRetry, onCancel }: SigningOutProps) {
  // Rendered on <body> so nothing on the page (header, floating buttons) sits above it.
  // Only mounted after a click, so document always exists here.
  return createPortal(
    <div
      role={error ? "alertdialog" : "status"}
      aria-live="polite"
      className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-center justify-center p-4 animate-[auth-fade-in_200ms_ease-out] motion-reduce:animate-none"
    >
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
        {error ? (
          <>
            <div className="w-14 h-14 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center">
              <AlertCircle size={26} />
            </div>
            <div>
              <p className="font-semibold">Couldn&apos;t sign you out</p>
              <p className="text-sm text-muted mt-1">{error}</p>
            </div>
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-border hover:bg-surface-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onRetry}
                autoFocus
                className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-primary hover:bg-primary-hover text-white transition-colors"
              >
                Try again
              </button>
            </div>
          </>
        ) : (
          <AuthStatusMessage title="Signing you out…" detail="See you soon!" />
        )}
      </div>
    </div>,
    document.body
  );
}
