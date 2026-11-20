"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { noteInSiteNavigation } from "@/lib/nav-history";

/** Counts page changes inside the site; renders nothing. */
export function NavigationTracker() {
  const pathname = usePathname();
  const firstPath = useRef(pathname);

  useEffect(() => {
    if (pathname !== firstPath.current) {
      firstPath.current = pathname;
      noteInSiteNavigation();
    }
  }, [pathname]);

  return null;
}
