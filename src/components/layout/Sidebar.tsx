"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  UtensilsCrossed,
  Star,
  Radio,
  Zap,
  ImageIcon,
  type LucideIcon,
} from "lucide-react";
import type { NavItem } from "@/lib/roles";
import { NAV_ITEMS } from "@/lib/roles";

const iconMap: Record<string, LucideIcon> = {
  "utensils-crossed": UtensilsCrossed,
  star: Star,
  radio: Radio,
  zap: Zap,
  image: ImageIcon,
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-14 bottom-0 w-56 bg-sidebar border-r border-border flex flex-col z-30">
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
    </aside>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const Icon = iconMap[item.icon] ?? ImageIcon;
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
