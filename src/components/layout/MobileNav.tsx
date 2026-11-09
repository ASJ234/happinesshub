"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { Logo } from "./Logo";
import { NavSections } from "./Sidebar";
import type { User } from "@/lib/roles";

interface MobileNavProps {
  user: User | null;
  onLogout: () => void;
}

export function MobileNav({ user, onLogout }: MobileNavProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // The trigger disappears at the lg breakpoint, so a drawer left open by a
  // rotation or resize would otherwise keep the page inert with no way out.
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) dialogRef.current?.close();
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  // Closes on a backdrop tap (the event target is the dialog itself) and when
  // any link inside the drawer is followed.
  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    const target = event.target as HTMLElement;
    if (target === event.currentTarget || target.closest("a")) {
      dialogRef.current?.close();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="lg:hidden -ml-1 p-2 text-muted hover:text-foreground hover:bg-surface-elevated rounded-lg transition-colors"
        aria-label="Open menu"
        aria-haspopup="dialog"
      >
        <Menu size={22} />
      </button>

      <dialog
        ref={dialogRef}
        onClick={handleClick}
        aria-label="Main menu"
        className="mobile-nav fixed top-0 bottom-0 left-0 right-auto m-0 h-dvh max-h-none w-72 max-w-[85vw] p-0 bg-sidebar text-foreground border-r border-border backdrop:bg-black/60"
      >
        <div className="flex h-full flex-col pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between h-14 px-3 border-b border-border shrink-0">
            <Logo size="sm" />
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="p-2 text-muted hover:text-foreground hover:bg-surface-elevated rounded-lg transition-colors"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          <NavSections role={user?.role ?? "viewer"} />

          {user && (
            <div className="p-3 border-t border-border shrink-0">
              <button
                type="button"
                onClick={onLogout}
                className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-foreground hover:bg-surface-elevated transition-colors"
              >
                <LogOut size={18} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </dialog>
    </>
  );
}
