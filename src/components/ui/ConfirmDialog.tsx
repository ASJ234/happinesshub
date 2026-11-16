"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { Alert } from "./Alert";
import { Spinner } from "./Spinner";

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  /** The button that does it, e.g. "Delete video". */
  confirmLabel?: string;
  /** Shown on that button while it runs, e.g. "Deleting…". */
  busyLabel?: string;
  /** Does the work. Returns a message to show when it fails, or null. */
  action: () => Promise<string | null | void>;
  /** Reload the page's data afterwards and keep the spinner until it has. */
  refresh?: boolean;
}

interface ConfirmDialogProps extends ConfirmOptions {
  onClose: () => void;
}

type Phase = "asking" | "working" | "refreshing";

/**
 * Asks before a destructive action, with Cancel and a confirm button. While
 * the action runs the button shows a spinner and the dialog can't be closed;
 * a failure is shown inside the dialog so the user can retry or cancel.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Delete",
  busyLabel = "Deleting…",
  action,
  refresh = true,
  onClose,
}: ConfirmDialogProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("asking");
  const [error, setError] = useState<string | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const busy = phase !== "asking";

  // Cancel is focused first, so Enter never deletes by accident.
  useEffect(() => {
    cancelRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  // Closes once the refreshed page data has arrived.
  useEffect(() => {
    if (phase === "refreshing" && !refreshing) onClose();
  }, [phase, refreshing, onClose]);

  async function confirm() {
    setPhase("working");
    setError(null);
    let problem: string | null | void;
    try {
      problem = await action();
    } catch {
      problem = "Something went wrong. Try again.";
    }
    if (problem) {
      setError(problem);
      setPhase("asking");
      return;
    }
    if (!refresh) return onClose();
    setPhase("refreshing");
    startRefresh(() => router.refresh());
  }

  return (
    <div
      className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !busy && onClose()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        aria-busy={busy}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 shrink-0 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
          <div className="min-w-0">
            <h2 id="confirm-title" className="font-semibold">
              {title}
            </h2>
            {description && (
              <div id="confirm-description" className="text-sm text-muted mt-1">
                {description}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4">
            <Alert tone="error">{error}</Alert>
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-surface-elevated transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-80"
          >
            {busy && <Spinner size={16} />}
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
