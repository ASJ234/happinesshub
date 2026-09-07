"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Compass,
  Upload,
  Radio,
  Zap,
  FolderOpen,
  BarChart3,
  MessageCircle,
  Settings,
  LayoutDashboard,
  CreditCard,
  DollarSign,
  Shield,
  type LucideIcon,
} from "lucide-react";
import type { NavItem, Role } from "@/lib/roles";
import { getNavForRole } from "@/lib/roles";

const iconMap: Record<string, LucideIcon> = {
  home: Home,
  compass: Compass,
  upload: Upload,
  radio: Radio,
  zap: Zap,
  folder: FolderOpen,
  "bar-chart": BarChart3,
  "message-circle": MessageCircle,
  settings: Settings,
  "layout-dashboard": LayoutDashboard,
  "credit-card": CreditCard,
  "dollar-sign": DollarSign,
  shield: Shield,
};

interface SidebarProps {
  role: Role;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const navItems = getNavForRole(role);
  const mainItems = navItems.filter((item) => item.section === "main");
  const creatorItems = navItems.filter((item) => item.section === "creator");

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-56 bg-sidebar border-r border-border flex flex-col z-30">
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {mainItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}

        {creatorItems.length > 0 && (
          <>
            <div className="pt-4 pb-2">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
                Creator Tools
              </p>
            </div>
            {creatorItems.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </>
        )}
      </nav>

      <div className="p-3 border-t border-border">
        <div className="text-[11px] text-muted space-y-1">
          <div className="flex gap-2">
            <span>Your videos</span>
            <span>•</span>
            <span>Drafts (2)</span>
            <span>•</span>
            <span>Scheduled (1)</span>
          </div>
          <div className="mt-2">
            <div className="flex justify-between mb-1">
              <span>Storage</span>
              <span>34.5 GB / 100 GB</span>
            </div>
            <div className="h-1.5 bg-surface-elevated rounded-full overflow-hidden">
              <div className="h-full w-[34.5%] gradient-brand rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = iconMap[item.icon] ?? Home;
  const isActive = pathname === item.href;

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? "bg-primary text-white"
          : "text-muted hover:text-foreground hover:bg-surface-elevated"
      }`}
    >
      <Icon size={18} />
      {item.label}
    </Link>
  );
}
