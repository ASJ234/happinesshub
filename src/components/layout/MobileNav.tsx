"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@/lib/roles";
import { SECTION_ORDER, getNavForRole } from "@/lib/roles";

export function MobileNav({ user }: { user: User | null }) {
  const pathname = usePathname();
  const items = getNavForRole(user?.role ?? "viewer").sort(
    (a, b) => SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section)
  );

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-header border-t border-border pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch max-w-lg mx-auto overflow-x-auto no-scrollbar">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const isMain = item.section === "main";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${
                isMain ? "flex-1" : "flex-none w-14"
              } flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] leading-tight text-center px-1 transition-colors ${
                isActive
                  ? "text-primary font-semibold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
