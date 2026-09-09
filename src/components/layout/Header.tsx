"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Upload,
  Bell,
  Settings,
  LogOut,
} from "lucide-react";
import { Logo } from "./Logo";
import type { User } from "@/lib/roles";
import { NAV_ITEMS, ROLE_LABELS } from "@/lib/roles";

interface HeaderProps {
  user: User | null;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="fixed top-0 left-0 right-0 bg-header border-b border-border z-40">
      <div className="flex items-center gap-3 h-14 px-3 sm:px-4">
        <Logo size="sm" />

        <nav className="hidden lg:flex items-center gap-1 text-sm">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted hover:text-foreground hover:bg-surface-elevated"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:block flex-1 max-w-xl mx-auto">
          <SearchField />
        </div>

        <div className="flex-1 lg:hidden" />

        <div className="flex items-center gap-1.5 sm:gap-2">
          {user &&
            user.role !== "viewer" && (
              <button className="hidden sm:flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                <Upload size={16} />
                Upload
              </button>
            )}

          {user ? (
            <>
              <button className="p-2 text-muted hover:text-foreground hover:bg-surface-elevated rounded-lg transition-colors">
                <Bell size={18} />
              </button>

              <button className="hidden sm:block p-2 text-muted hover:text-foreground hover:bg-surface-elevated rounded-lg transition-colors">
                <Settings size={18} />
              </button>

              <button
                onClick={handleLogout}
                className="p-2 text-muted hover:text-foreground hover:bg-surface-elevated rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>

              <div className="flex items-center gap-2 ml-1">
                <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold">
                  {user.initials}
                </div>
                <div className="hidden xl:block">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-[11px] text-muted mt-0.5">{ROLE_LABELS[user.role]}</p>
                </div>
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      <div className="px-3 pb-3 lg:hidden">
        <SearchField />
      </div>
    </header>
  );
}

function SearchField() {
  return (
    <div className="relative">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        type="search"
        placeholder="Search videos, live streams, shorts..."
        className="w-full bg-surface border border-border rounded-full py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
    </div>
  );
}