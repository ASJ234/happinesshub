import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface AlertProps {
  tone: "error" | "success";
  children: ReactNode;
}

const TONES = {
  error: {
    icon: AlertCircle,
    className: "text-red-400 bg-red-500/10 border-red-500/30",
  },
  success: {
    icon: CheckCircle2,
    className: "text-green-400 bg-green-500/10 border-green-500/30",
  },
} as const;

export function Alert({ tone, children }: AlertProps) {
  const { icon: Icon, className } = TONES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 text-sm border rounded-lg px-3 py-2.5 ${className}`}
    >
      <Icon size={16} className="shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}
