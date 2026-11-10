import type { ReactNode } from "react";

interface FieldProps {
  label: ReactNode;
  optional?: boolean;
  /** Small text under the control. */
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** A labelled form control. */
export function Field({ label, optional, hint, className = "", children }: FieldProps) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm text-muted block mb-1.5">
        {label} {optional && <span className="text-xs">(optional)</span>}
      </span>
      {children}
      {hint && <span className="text-[11px] text-muted block mt-1.5">{hint}</span>}
    </label>
  );
}
