import { Loader2 } from "lucide-react";

interface SpinnerProps {
  size?: number;
  className?: string;
}

/** A spinning loading indicator; hidden from screen readers. */
export function Spinner({ size = 16, className = "" }: SpinnerProps) {
  return <Loader2 size={size} aria-hidden="true" className={`animate-spin ${className}`} />;
}
