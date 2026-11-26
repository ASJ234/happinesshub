"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Upload,
  Settings,
  LogOut,
} from "lucide-react";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import type { User } from "@/lib/roles";
import { getNavForRole } from "@/lib/roles";
import { AccountMenu } from "./AccountMenu";
import { NotificationBell } from "./NotificationBell";
import { SigningOut } from "@/components/auth/SigningOut";
import type { NavBadges } from "./Sidebar";
import type { AdminAlert } from "@/lib/admin-alerts";

interface HeaderProps {
  user: User | null;
  /** What is waiting for this user; drives the bell. */
  alerts?: AdminAlert[];
  /** Counts next to items in the mobile menu. */
  badges?: NavBadges;
}

export function Header({ user, alerts = [], badges = {} }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  // null: not signing out. "": in progress. Otherwise the failure message.
  const [signOut, setSignOut] = useState<string | null>(null);

  async function handleLogout() {
    if (signOut === "") return;
    setSignOut("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error(String(response.status));
    } catch (err) {
      setSignOut(
        err instanceof TypeError
          ? "Can't reach the server. Check your connection and try again."
          : "Something went wrong. Please try again."
      );
      return;
    }
    // The cover stays up until the login page replaces the dashboard.
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="fixed top-0 left-0 right-0 bg-header border-b border-border z-40">
      <div className="flex items-center gap-2 lg:gap-3 h-14 px-3 sm:px-4">
        <MobileNav user={user} onLogout={handleLogout} badges={badges} />
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
            (user.role === "creator" || user.role === "admin") && (
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
              <NotificationBell alerts={alerts} />

              <Link
                href="/dashboard/settings"
                className="hidden sm:block p-2 text-muted hover:text-foreground hover:bg-surface-elevated rounded-lg transition-colors"
                title="Settings"
              >
                <Settings size={18} />
              </Link>

              <button
                onClick={handleLogout}
                className="hidden sm:block p-2 text-muted hover:text-foreground hover:bg-surface-elevated rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>

              <AccountMenu user={user} onLogout={handleLogout} />
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

      {signOut !== null && (
        <SigningOut
          error={signOut || null}
          onRetry={handleLogout}
          onCancel={() => setSignOut(null)}
        />
      )}
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