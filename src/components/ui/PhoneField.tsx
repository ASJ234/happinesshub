"use client";

import { forwardRef, useId } from "react";
import { AlertCircle } from "lucide-react";

interface PhoneFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Shown under the box in red, e.g. "Please fill in your number". */
  error?: string | null;
  /** The roomier input used on full-page forms. */
  large?: boolean;
}

const BASE =
  "w-full bg-surface-elevated border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2";

/** The required payment number, with its problem shown right beneath it. */
export const PhoneField = forwardRef<HTMLInputElement, PhoneFieldProps>(
  function PhoneField({ label, value, onChange, error, large }, ref) {
    const id = useId();
    const messageId = `${id}-message`;

    return (
      <div>
        <label htmlFor={id} className="text-sm text-muted block mb-1.5">
          {label} <span className="text-accent-red" aria-hidden="true">*</span>
        </label>
        <input
          ref={ref}
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0772123456"
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={messageId}
          className={`${BASE} ${large ? "px-4 py-2.5" : "px-3 py-2"} ${
            error
              ? "border-red-500 focus:ring-red-500/40"
              : "border-border focus:ring-primary/50"
          }`}
        />
        {error ? (
          <p
            id={messageId}
            role="alert"
            className="flex items-start gap-1.5 text-xs text-red-400 mt-1.5"
          >
            <AlertCircle size={14} className="shrink-0 mt-px" />
            {error}
          </p>
        ) : (
          <p id={messageId} className="text-[11px] text-muted mt-1.5">
            MTN or Airtel number, e.g. 0772123456
          </p>
        )}
      </div>
    );
  }
);
