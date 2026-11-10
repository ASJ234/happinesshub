"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard/admin", label: "Overview" },
  { href: "/dashboard/admin/videos", label: "Video review" },
  { href: "/dashboard/admin/listings", label: "Profiles & shops" },
  { href: "/dashboard/admin/live", label: "Live requests" },
  { href: "/dashboard/admin/wallet", label: "Wallets" },
  { href: "/dashboard/admin/settings", label: "Settings" },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto no-scrollbar border-b border-border mb-6">
      {TABS.map((tab) => {
        const active =
          pathname === tab.href ||
          (tab.href !== "/dashboard/admin" && pathname.startsWith(tab.href));

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
