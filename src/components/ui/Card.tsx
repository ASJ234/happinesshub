import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** For linking straight to this card, e.g. from page links. */
  id?: string;
}

export function Card({ children, className = "", id }: CardProps) {
  return (
    <div id={id} className={`bg-surface border border-border rounded-xl ${className}`}>
      {children}
    </div>
  );
}
