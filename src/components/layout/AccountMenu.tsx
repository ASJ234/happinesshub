"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import type { User } from "@/lib/roles";
import { ROLE_LABELS } from "@/lib/roles";

interface AccountMenuProps {
  user: User;
  onLogout: () => void;
}

/** The avatar in the header; opens the account's username and sign-out. */
export function AccountMenu({ user, onLogout }: AccountMenuProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative ml-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex items-center gap-2 rounded-lg p-1 hover:bg-surface-elevated transition-colors"
      >
        <span className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold">
          {user.initials}
        </span>
        <span className="hidden xl:block text-left">
          <span className="block text-sm font-medium leading-none">{user.name}</span>
          <span className="block text-[11px] text-muted mt-0.5">{ROLE_LABELS[user.role]}</span>
        </span>
        <ChevronDown
          size={14}
          className={`hidden sm:block text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 w-64 z-50 bg-surface border border-border rounded-xl shadow-xl overflow-hidden"
          >
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <span className="w-10 h-10 shrink-0 rounded-full gradient-brand flex items-center justify-center text-white text-sm font-bold">
                {user.initials}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{user.name}</p>
                <p className="text-xs text-muted truncate">@{user.username}</p>
                <p className="text-[11px] text-primary mt-0.5">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>
            <div className="p-1.5">
              <Link
                href="/dashboard/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-surface-elevated transition-colors"
              >
                <Settings size={16} className="text-muted" />
                Settings
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={16} />
                Log out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
