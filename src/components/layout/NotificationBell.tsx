"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, ChevronRight } from "lucide-react";
import { CountBadge } from "@/components/ui/CountBadge";
import type { AdminAlert } from "@/lib/admin-alerts";

/** The header bell: a count and a list of what is waiting for this user. */
export function NotificationBell({ alerts }: { alerts: AdminAlert[] }) {
  const [open, setOpen] = useState(false);
  const total = alerts.reduce((sum, alert) => sum + alert.count, 0);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-muted hover:text-foreground hover:bg-surface-elevated rounded-lg transition-colors"
        title="Notifications"
        aria-label={total > 0 ? `Notifications (${total} waiting)` : "Notifications"}
      >
        <Bell size={18} />
        <CountBadge count={total} className="absolute -top-0.5 -right-0.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 z-50 bg-surface border border-border rounded-xl shadow-xl p-4">
            <p className="text-sm font-medium mb-1">Notifications</p>
            {alerts.length === 0 ? (
              <p className="text-xs text-muted">
                You&apos;re all caught up. Notifications will appear here once
                activity starts.
              </p>
            ) : (
              <ul className="-mx-2 mt-2">
                {alerts.map((alert) => (
                  <li key={alert.href}>
                    <Link
                      href={alert.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-surface-elevated"
                    >
                      <CountBadge count={alert.count} />
                      <span className="flex-1">{alert.label}</span>
                      <ChevronRight size={16} className="text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
