"use client";

import { useState, type FormEvent } from "react";
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
import { getNavForRole, ROLE_LABELS } from "@/lib/roles";

interface HeaderProps {
  user: User | null;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [bellOpen, setBellOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="fixed top-0 left-0 right-0 bg-header border-b border-border z-40">
      <div className="flex items-center gap-3 h-14 px-3 sm:px-4">
        <Logo size="sm" />

        <nav className="hidden lg:flex items-center gap-1 text-sm min-w-0 overflow-x-auto no-scrollbar">
          {getNavForRole(user?.role ?? "viewer")
            .filter((item) => item.section === "main")
            .map((item) => {
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
              <Link
                href="/dashboard/upload"
                className="hidden sm:flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Upload size={16} />
                Upload
              </Link>
            )}

          {user ? (
            <>
              <div className="relative">
                <button
                  onClick={() => setBellOpen((v) => !v)}
                  className="p-2 text-muted hover:text-foreground hover:bg-surface-elevated rounded-lg transition-colors"
                  title="Notifications"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                </button>
                {bellOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setBellOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-72 z-50 bg-surface border border-border rounded-xl shadow-xl p-4">
                      <p className="text-sm font-medium mb-1">Notifications</p>
                      <p className="text-xs text-muted">
                        You&apos;re all caught up. Notifications will appear here
                        once activity starts.
                      </p>
                    </div>
                  </>
                )}
              </div>

              <Link
                href="/dashboard/settings"
                className="hidden sm:block p-2 text-muted hover:text-foreground hover:bg-surface-elevated rounded-lg transition-colors"
                title="Settings"
              >
                <Settings size={18} />
              </Link>

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
  const router = useRouter();
  const [query, setQuery] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/dashboard/search?q=${encodeURIComponent(q)}` : "/dashboard/explore");
  }

  return (
    <form onSubmit={handleSubmit} className="relative" role="search">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search videos, live streams, shorts..."
        className="w-full bg-surface border border-border rounded-full py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
    </form>
  );
}