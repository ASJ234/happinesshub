"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { WEEKDAY_NAMES } from "@/lib/live";

const SAVE_DELAY_MS = 500;

type SaveState = "idle" | "saving" | "saved" | "error";

interface LiveDaysPickerProps {
  initialDays: number[];
}

/**
 * The weekdays creators may go live on. Each tap saves by itself: quick taps
 * are batched into one save, and a failed save puts the days back.
 */
export function LiveDaysPicker({ initialDays }: LiveDaysPickerProps) {
  const [days, setDays] = useState<number[]>([...initialDays].sort());
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const savedDays = useRef<number[]>([...initialDays].sort());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(0);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function save(next: number[], version: number) {
    setState("saving");
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ live_allowed_weekdays: next }),
    }).catch(() => null);
    if (version !== latest.current) return; // a newer change is on its way

    if (!response?.ok) {
      const body = await response?.json().catch(() => null);
      setDays(savedDays.current);
      setError(body?.error ?? "Could not save the live days. Try again.");
      setState("error");
      return;
    }
    savedDays.current = next;
    setError(null);
    setState("saved");
  }

  function toggle(day: number) {
    const next = days.includes(day)
      ? days.filter((d) => d !== day)
      : [...days, day].sort();
    setDays(next);
    setError(null);
    setState("saving");

    const version = ++latest.current;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => save(next, version), SAVE_DELAY_MS);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {WEEKDAY_NAMES.map((name, index) => {
          const day = index + 1;
          const on = days.includes(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => toggle(day)}
              aria-pressed={on}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                on
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-surface-elevated text-muted"
              }`}
            >
              {name}
            </button>
          );
        })}
      </div>

      <p role="status" aria-live="polite" className="text-xs h-4 flex items-center gap-1.5">
        {state === "saving" && (
          <span className="text-muted inline-flex items-center gap-1.5">
            <Spinner size={12} /> Saving…
          </span>
        )}
        {state === "saved" && (
          <span className="text-green-400 inline-flex items-center gap-1">
            <Check size={13} /> Saved. Creators see the new days straight away.
          </span>
        )}
        {state === "error" && <span className="text-red-400">{error}</span>}
      </p>

      {days.length === 0 && (
        <p className="text-xs text-yellow-400">
          No days are ticked, so nobody can go live until you tick at least one.
        </p>
      )}
    </div>
  );
}
