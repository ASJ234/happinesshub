"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem, Role, User } from "@/lib/roles";
import { SECTION_LABELS, SECTION_ORDER, getNavForRole } from "@/lib/roles";
import { CountBadge } from "@/components/ui/CountBadge";

/** Counts shown next to nav items, keyed by href. */
export type NavBadges = Record<string, number>;

export function Sidebar({ user, badges = {} }: { user: User | null; badges?: NavBadges }) {
  return (
    <aside className="hidden lg:flex fixed left-0 top-14 bottom-0 w-60 bg-sidebar border-r border-border flex-col z-30">
      <NavSections role={user?.role ?? "viewer"} badges={badges} />
    </aside>
  );
}

export function NavSections({ role, badges = {} }: { role: Role; badges?: NavBadges }) {
  const pathname = usePathname();
  const items = getNavForRole(role);

  return (
    <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
      {SECTION_ORDER.map((section) => {
        const sectionItems = items.filter((item) => item.section === section);
        if (sectionItems.length === 0) return null;

        return (
          <div key={section} className="space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted/70">
              {SECTION_LABELS[section]}
            </p>
            {sectionItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                pathname={pathname}
                badge={badges[item.href] ?? 0}
              />
            ))}
          </div>
        );
      })}
    </nav>
  );
}

function NavLink({
  item,
  pathname,
  badge,
}: {
  item: NavItem;
  pathname: string;
  badge: number;
}) {
  const Icon = item.icon;
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
      <span className="flex-1">{item.label}</span>
      <CountBadge count={badge} />
    </Link>
  );
}
