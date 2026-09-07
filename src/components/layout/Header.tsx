"use client";

import { useRouter } from "next/navigation";
import {
  Search,
  Home,
  Radio,
  Zap,
  Upload,
  Bell,
  Settings,
  LogOut,
} from "lucide-react";
import { Logo } from "./Logo";
import type { User } from "@/lib/roles";
import { ROLE_LABELS } from "@/lib/roles";

interface HeaderProps {
  user: User;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-header border-b border-border flex items-center px-4 gap-4 z-40">
      <Logo size="sm" />

      <div className="flex-1 max-w-xl mx-auto">
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
      </div>

      <nav className="hidden md:flex items-center gap-1">
        <HeaderLink href="/dashboard" icon={Home} label="Home" />
        <HeaderLink href="/dashboard/live-studio" icon={Radio} label="Live" />
        <HeaderLink href="/dashboard/shorts-studio" icon={Zap} label="Shorts" />
      </nav>

      <div className="flex items-center gap-2">
        {user.role !== "viewer" && (
          <button className="hidden sm:flex items-center gap-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Upload size={16} />
            Upload
          </button>
        )}

        <button className="p-2 text-muted hover:text-foreground hover:bg-surface-elevated rounded-lg transition-colors">
          <Bell size={18} />
        </button>

        <button className="p-2 text-muted hover:text-foreground hover:bg-surface-elevated rounded-lg transition-colors">
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
          <div className="hidden lg:block">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-[11px] text-muted mt-0.5">{ROLE_LABELS[user.role]}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function HeaderLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted hover:text-foreground hover:bg-surface-elevated rounded-lg transition-colors"
    >
      <Icon size={16} />
      {label}
    </a>
  );
}
